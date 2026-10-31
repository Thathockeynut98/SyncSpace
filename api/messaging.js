import {resolveSpace} from "./spaces.js";
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const reactions = ['❤️','👍','😂','😮','😢','🎉'];
export function validPayload(data) {
  if (!data || typeof data !== 'object') return false;
  const canonical = (value, min, max) => {
    if (typeof value !== 'string' || value.length > max || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return false;
    const bytes = Buffer.from(value, 'base64');
    return bytes.length >= min && bytes.toString('base64') === value;
  };
  return canonical(data.iv, 12, 16) && Buffer.from(data.iv, 'base64').length === 12 &&
    canonical(data.cipher, 17, 7000) && (data.clientId === undefined || uuid.test(data.clientId));
}
export async function isMember(pool, spaceId, email) {
 const found=await pool.query('SELECT id,email FROM app.accounts WHERE email=$1',[email]);
 return found.rowCount>0&&!!await resolveSpace(pool,spaceId,found.rows[0]);
}
async function exists(pool, spaceId, messageId, sourceIds) {
  const result = await pool.query(`SELECT 1 FROM migration.imported_records WHERE entity_type='Message' AND source_id=$2 AND original_row->>'space_id'=$1
    UNION ALL SELECT 1 FROM app.messages WHERE space_id::text=ANY($3) AND 'local-'||id::text=$2 LIMIT 1`, [spaceId, messageId, sourceIds]);
  return result.rowCount > 0;
}
export async function handleMessages({req, res, url, pool, accountFromToken, reply, bodyJson}) {
  const match = /^\/spaces\/([A-Za-z0-9_-]{1,100})\/messages(?:\/([^/]{1,300})\/(reactions|pin))?$/.exec(url.pathname);
  if (!match) return false;
  const account = await accountFromToken(req);
  if (!account) { reply(res,401,{error:'Unauthorized'}); return true; }
  const room = await resolveSpace(pool,match[1],account);
  if (!room) { reply(res,404,{error:'Not found'}); return true; }
  const spaceId=room.id;
  if (match[2]) {
    let messageId;
    try { messageId = decodeURIComponent(match[2]); } catch { reply(res,400,{error:'Invalid message id'}); return true; }
    if (!await exists(pool,spaceId,messageId,room.sourceIds)) { reply(res,404,{error:'Not found'}); return true; }
    if (!['PUT','DELETE'].includes(req.method)) { reply(res,405,{error:'Method not allowed'}); return true; }
    if (match[3] === 'reactions') {
      const {emoji} = await bodyJson(req);
      if (!reactions.includes(emoji)) { reply(res,400,{error:'Invalid reaction'}); return true; }
      if (req.method === 'PUT') await pool.query('INSERT INTO app.message_reactions VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[spaceId,messageId,account.id,emoji]);
      else await pool.query('DELETE FROM app.message_reactions WHERE space_id=$1 AND message_id=$2 AND account_id=$3 AND emoji=$4',[spaceId,messageId,account.id,emoji]);
    } else {
      if (req.method === 'PUT') await pool.query('INSERT INTO app.message_pins(space_id,message_id,account_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[spaceId,messageId,account.id]);
      else await pool.query('DELETE FROM app.message_pins WHERE space_id=$1 AND message_id=$2',[spaceId,messageId]);
    }
    reply(res,200,{status:'ok'}); return true;
  }
  if (req.method === 'POST') {
    const data = await bodyJson(req);
    if (!validPayload(data)) { reply(res,400,{error:'Invalid encrypted payload'}); return true; }
    const inserted = await pool.query(`INSERT INTO app.messages(space_id,account_id,cipher,iv,client_id) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT (account_id,client_id) WHERE client_id IS NOT NULL DO NOTHING RETURNING id,created_at`,[room.storageId,account.id,data.cipher,data.iv,data.clientId || null]);
    let row = inserted.rows[0];
    if (!row) {
      const existing = await pool.query('SELECT id,created_at,space_id,cipher,iv FROM app.messages WHERE account_id=$1 AND client_id=$2',[account.id,data.clientId]);
      row = existing.rows[0];
      if (!row || !room.sourceIds.includes(String(row.space_id)) || row.cipher !== data.cipher || row.iv !== data.iv) { reply(res,409,{error:'Client id already used'}); return true; }
    }
    reply(res,inserted.rowCount ? 201 : 200,{id:'local-'+row.id,createdDate:row.created_at,clientId:data.clientId}); return true;
  }
  if (req.method !== 'GET') { reply(res,405,{error:'Method not allowed'}); return true; }
  // A cursor is a stable offset in each append-only source. Fetch every page to
  // avoid starving recent local messages behind large imported collections.
  let importedOffset=0, localOffset=0;
  if (url.searchParams.has('cursor')) {
    const cursor=url.searchParams.get('cursor');
    if (!/^\d{1,10}:\d{1,10}$/.test(cursor)) { reply(res,400,{error:'Invalid cursor'}); return true; }
    [importedOffset,localOffset]=cursor.split(':').map(Number);
  }
  const limit=200;
  const [imported, recent, reactionRows, pins] = await Promise.all([
    pool.query("SELECT m.source_id,m.original_row,(SELECT u.original_row->>'email' FROM migration.imported_records u WHERE u.entity_type='User' AND (u.source_id=m.original_row->>'author_id' OR u.original_row->>'id'=m.original_row->>'author_id') LIMIT 1) AS author_email FROM migration.imported_records m WHERE m.entity_type='Message' AND m.original_row->>'space_id'=$1 ORDER BY m.source_id LIMIT $2 OFFSET $3",[spaceId,limit+1,importedOffset]),
    pool.query('SELECT m.id,m.cipher,m.iv,m.created_at,m.client_id,a.email FROM app.messages m JOIN app.accounts a ON a.id=m.account_id WHERE m.space_id::text=ANY($1) ORDER BY m.id LIMIT $2 OFFSET $3',[room.sourceIds,limit+1,localOffset]),
    pool.query('SELECT message_id,emoji,count(*)::int AS count,bool_or(account_id=$2) AS mine FROM app.message_reactions WHERE space_id=$1 GROUP BY message_id,emoji',[spaceId,account.id]),
    pool.query('SELECT message_id FROM app.message_pins WHERE space_id=$1',[spaceId])
  ]);
  const messages=imported.rows.slice(0,limit).map(({source_id,original_row:r,author_email})=>({id:source_id,authorId:r.author_id,authorEmail:author_email,authorName:r.author_name,cipher:r.cipher,iv:r.iv,createdDate:r.created_date}));
  messages.push(...recent.rows.slice(0,limit).map(r=>({id:'local-'+r.id,authorId:r.email,cipher:r.cipher,iv:r.iv,createdDate:r.created_at,clientId:r.client_id})));
  for (const message of messages) {
    message.reactions=reactionRows.rows.filter(r=>r.message_id===message.id).map(({emoji,count,mine})=>({emoji,count,mine}));
    message.pinned=pins.rows.some(r=>r.message_id===message.id);
  }
  const more=imported.rowCount>limit||recent.rowCount>limit;
  reply(res,200,{spaceId,messages,encrypted:true,nextCursor:more?`${importedOffset+Math.min(imported.rowCount,limit)}:${localOffset+Math.min(recent.rowCount,limit)}`:null});
  return true;
}
