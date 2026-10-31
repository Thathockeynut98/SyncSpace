import crypto from "node:crypto";
export function memberList(value) {
 try { const result=Array.isArray(value)?value:JSON.parse(value||'[]');return Array.isArray(result)?result:[]; }catch{return []}
}
export async function resolveSpace(pool, requested, account) {
 const imported=await pool.query("SELECT source_id,original_row FROM migration.imported_records WHERE entity_type='Space' AND source_id=$1",[requested]);
 const mapping=await pool.query('SELECT legacy_space_id,local_space_id FROM app.legacy_space_mappings WHERE legacy_space_id=$1 OR local_space_id::text=$1',[requested]);
 const link=mapping.rows[0];
 const local=await pool.query('SELECT s.*,m.display_name FROM app.shared_spaces s JOIN app.shared_space_members m ON m.space_id=s.id WHERE s.id::text=$1 AND m.account_id=$2',[String(link?.local_space_id||requested),account.id]);
 let legacy=imported.rows[0];
 if(!legacy&&link)legacy=(await pool.query("SELECT source_id,original_row FROM migration.imported_records WHERE entity_type='Space' AND source_id=$1",[link.legacy_space_id])).rows[0];
 if(legacy){
  if(!memberList(legacy.original_row.member_emails).some(e=>String(e).trim().toLowerCase()===account.email))return null;
  if(link&&!local.rowCount)return null;
  return {id:legacy.source_id,storageId:link?.local_space_id||legacy.source_id,sourceIds:[...new Set([legacy.source_id,String(link?.local_space_id||legacy.source_id)])],name:legacy.original_row.name,invite_code:local.rows[0]?.invite_code||legacy.original_row.invite_code,member_emails:memberList(legacy.original_row.member_emails),member_names:memberList(legacy.original_row.member_names)};
 }
 if(!local.rowCount)return null;
 const row=local.rows[0];
 return {id:String(row.id),storageId:row.id,sourceIds:[String(row.id)],name:row.name,invite_code:row.invite_code};
}
export async function listSpaces(pool,account){
 const ids=await pool.query(`SELECT s.id::text AS id FROM app.shared_spaces s JOIN app.shared_space_members m ON m.space_id=s.id WHERE m.account_id=$1
 UNION SELECT source_id FROM migration.imported_records WHERE entity_type='Space'`,[account.id]);
 const rooms=new Map();
 for(const {id} of ids.rows){const room=await resolveSpace(pool,id,account);if(room)rooms.set(room.id,{id:room.id,name:room.name,invite_code:room.invite_code,encryption_space_id:room.id,member_emails:room.member_emails||[],member_names:room.member_names||[]})}
 return [...rooms.values()];
}
export async function handleSpaces({req,res,path,pool,accountFromToken,reply,bodyJson}) {
    // SYNCSPACE_21_SPACES_START
    if (
      req.method === "POST" &&
      (path === "/spaces" || path === "/spaces/join")
    ) {
      const account = await accountFromToken(req);
      if (!account) {
        return reply(res, 401, { error: "Unauthorized" });
      }
      const input = await bodyJson(req);
      if (path === "/spaces") {
        const name = String(input.name || "Our Little Space")
          .trim()
          .slice(0, 100) || "Our Little Space";
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const makeCode = () => {
          const bytes = crypto.randomBytes(8);
          const chars = Array.from(bytes, (byte) =>
            alphabet[byte % alphabet.length]
          );
          return chars.slice(0, 4).join("") +
            "-" +
            chars.slice(4).join("");
        };
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const existing = await client.query(
            `SELECT s.id
             FROM app.shared_spaces s
             JOIN app.shared_space_members m
               ON m.space_id = s.id
             WHERE m.account_id = $1
             LIMIT 1`,
            [account.id]
          );
          if (existing.rows.length) {
            await client.query("ROLLBACK");
            return reply(res, 409, {
              error: "You already belong to a shared space."
            });
          }
          let created = null;
          for (let attempt = 0; attempt < 8; attempt++) {
            const inviteCode = makeCode();
            const result = await client.query(
              `INSERT INTO app.shared_spaces
                (name, invite_code, created_by)
               VALUES ($1, $2, $3)
               ON CONFLICT (invite_code) DO NOTHING
               RETURNING id, name, invite_code`,
              [name, inviteCode, account.id]
            );
            if (result.rows.length) {
              created = result.rows[0];
              break;
            }
          }
          if (!created) {
            throw new Error("Could not generate a unique invite code");
          }
          await client.query(
            `INSERT INTO app.shared_space_members
              (space_id, account_id, display_name)
             VALUES ($1, $2, $3)`,
            [
              created.id,
              account.id,
              account.email.split("@")[0]
            ]
          );
          await client.query("COMMIT");
          return reply(res, 201, {
            space: {
              id: created.id,
              name: created.name,
              invite_code: created.invite_code,
              member_emails: [account.email],
              member_names: [account.email.split("@")[0]]
            }
          });
        } catch (error) {
          await client.query("ROLLBACK").catch(() => {});
          throw error;
        } finally {
          client.release();
        }
      }
      if (path === "/spaces/join") {
        const code = String(input.code || "")
          .trim()
          .toUpperCase();
        if (!/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(code)) {
          return reply(res, 400, {
            error: "Enter a valid eight-character join code."
          });
        }
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const found = await client.query(
            `SELECT id, name, invite_code
             FROM app.shared_spaces
             WHERE invite_code = $1
             FOR UPDATE`,
            [code]
          );
          if (!found.rows.length) {
            await client.query("ROLLBACK");
            return reply(res, 404, {
              error: "No space found with that code."
            });
          }
          const space = found.rows[0];
          const currentMembership = await client.query(
            `SELECT space_id
             FROM app.shared_space_members
             WHERE account_id = $1`,
            [account.id]
          );
          if (
            currentMembership.rows.length &&
            currentMembership.rows[0].space_id !== space.id
          ) {
            await client.query("ROLLBACK");
            return reply(res, 409, {
              error: "You already belong to another space."
            });
          }
          const members = await client.query(
            `SELECT COUNT(*)::int AS total
             FROM app.shared_space_members
             WHERE space_id = $1`,
            [space.id]
          );
          const alreadyMember = currentMembership.rows.some(
            (row) => row.space_id === space.id
          );
          if (!alreadyMember && members.rows[0].total >= 2) {
            await client.query("ROLLBACK");
            return reply(res, 409, {
              error: "This space already has two members."
            });
          }
          if (!alreadyMember) {
            await client.query(
              `INSERT INTO app.shared_space_members
                (space_id, account_id, display_name)
               VALUES ($1, $2, $3)`,
              [
                space.id,
                account.id,
                account.email.split("@")[0]
              ]
            );
          }
          const membership = await client.query(
            `SELECT a.email, m.display_name
             FROM app.shared_space_members m
             JOIN app.accounts a ON a.id = m.account_id
             WHERE m.space_id = $1
             ORDER BY m.joined_at`,
            [space.id]
          );
          await client.query("COMMIT");
          return reply(res, 200, {
            space: {
              id: space.id,
              name: space.name,
              invite_code: space.invite_code,
              member_emails: membership.rows.map((m) => m.email),
              member_names: membership.rows.map((m) => m.display_name)
            }
          });
        } catch (error) {
          await client.query("ROLLBACK").catch(() => {});
          throw error;
        } finally {
          client.release();
        }
      }
    }
    // SYNCSPACE_21_SPACES_END

 if(req.method==='GET'&&path==='/spaces'){
  const account=await accountFromToken(req);if(!account)return reply(res,401,{error:'Unauthorized'});
  return reply(res,200,{spaces:await listSpaces(pool,account)});
 }
}
