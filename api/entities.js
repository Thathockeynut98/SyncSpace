import {resolveSpace} from './spaces.js';
import {validPayload} from './messaging.js';
const readable=new Set(['Note','Memory','Mood','Heart','CanvasDoc','ReadingDoc','Goodnight','CodexEntry','VoiceNote','Photo','Media','Video','SleepTrack','BrushTip']);
const writable=new Set(['Note','Memory','Mood','Heart','Goodnight']);
export async function handleEntities({req,res,url,pool,accountFromToken,reply,bodyJson}){
 const match=/^\/spaces\/([-\w]{1,100})\/entities\/(\w+)(?:\/([-\w]{1,100}))?$/.exec(url.pathname);if(!match)return false;
 const account=await accountFromToken(req);if(!account){reply(res,401,{error:'Unauthorized'});return true;}
 const room=await resolveSpace(pool,match[1],account),type=match[2],id=match[3];
 if(!room||!readable.has(type)){reply(res,404,{error:'Not found'});return true;}
 if(req.method==='GET'&&!id){
  const offset=Number(url.searchParams.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0||offset>1000000){reply(res,400,{error:'Invalid offset'});return true;}
  const result=await pool.query(`SELECT source_id AS id, original_row AS data, NULL::timestamptz AS created_at FROM migration.imported_records WHERE entity_type=$1 AND original_row->>'space_id'=ANY($2)
   UNION ALL SELECT id::text,data,created_at FROM app.local_entities WHERE entity_type=$1 AND space_id=ANY($2) ORDER BY id LIMIT 201 OFFSET $3`,[type,room.sourceIds,offset]);
  reply(res,200,{items:result.rows.slice(0,200).map(r=>({...r.data,id:r.id,space_id:room.id,created_date:r.data.created_date||r.created_at})),nextOffset:result.rowCount>200?offset+200:null});return true;
 }
 if(!writable.has(type)){reply(res,409,{error:'This collection is currently read-only during restoration.'});return true;}
 if(req.method==='POST'&&!id){
  const input=await bodyJson(req);if(!input||typeof input!=='object'){reply(res,400,{error:'Invalid record'});return true;}
  const data={...input,space_id:room.id};delete data.id;delete data.created_date;delete data.updated_date;
  for(const field of ['author_id','from_id','owner_id','added_by_id'])if(field in data)data[field]=String(account.id);
  data.author_id=String(account.id);
  if(['Note','Memory','Goodnight'].includes(type)&&(!validPayload({iv:data.iv,cipher:data.cipher})||data.text||data.message)){reply(res,400,{error:'Encrypted content required'});return true;}
  const result=await pool.query('INSERT INTO app.local_entities(space_id,entity_type,account_id,data) VALUES($1,$2,$3,$4) RETURNING id,created_at',[room.id,type,account.id,data]);
  reply(res,201,{...data,id:result.rows[0].id,created_date:result.rows[0].created_at});return true;
 }
 if(id&&req.method==='DELETE'){
  const result=await pool.query('DELETE FROM app.local_entities WHERE id::text=$1 AND space_id=$2 AND entity_type=$3 AND account_id=$4',[id,room.id,type,account.id]);
  reply(res,result.rowCount?200:409,{status:result.rowCount?'deleted':'Original records are preserved; removal is unavailable.'});return true;
 }
 if(id&&req.method==='PATCH'&&type==='Mood'){
  const patch=await bodyJson(req),data={};if(typeof patch.mood==='string')data.mood=patch.mood.slice(0,50);if(typeof patch.note==='string')data.note=patch.note.slice(0,500);
  const result=await pool.query('UPDATE app.local_entities SET data=data||$5::jsonb,updated_at=now() WHERE id::text=$1 AND space_id=$2 AND entity_type=$3 AND account_id=$4 RETURNING data,id,created_at',[id,room.id,type,account.id,JSON.stringify(data)]);
  reply(res,result.rowCount?200:409,result.rowCount?{...result.rows[0].data,id:result.rows[0].id,created_date:result.rows[0].created_at}:{error:'Original records remain read-only.'});return true;
 }
 reply(res,405,{error:'Method unavailable during restoration'});return true;
}
