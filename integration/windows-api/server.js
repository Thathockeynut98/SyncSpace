import crypto from "node:crypto";
import http from "node:http";
import pg from "pg";
import { normalizeEmail, verifyPassword, newToken, tokenHash } from "./auth.js";
const pool = new pg.Pool({ host: process.env.PGHOST || "db", port: Number(process.env.PGPORT || 5432), database: process.env.PGDATABASE || "syncspace", user: process.env.PGUSER || "syncspace", password: process.env.PGPASSWORD, max: 5 });
function reply(res, status, data) { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }); res.end(JSON.stringify(data)); }
async function bodyJson(req) {
  let text = "";
  for await (const chunk of req) { text += chunk; if (text.length > 8192) throw new Error("Request too large"); }
  return JSON.parse(text || "{}");
}
async function accountFromToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) return null;
  const result = await pool.query("SELECT a.id,a.email FROM app.sessions s JOIN app.accounts a ON a.id=s.account_id WHERE s.token_hash=$1 AND s.expires_at>now()", [tokenHash(token)]);
  return result.rows[0] || null;
}
const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  try {
    if (req.method === "GET" && path === "/health") {
      await pool.query("SELECT 1");
      return reply(res, 200, { status: "ok", database: "connected", service: "syncspace-api" });
    }
    if (req.method === "POST" && path === "/auth/login") {
      const { email, password } = await bodyJson(req);
      const result = await pool.query("SELECT id,email,password_hash FROM app.accounts WHERE email=$1", [normalizeEmail(email)]);
      const user = result.rows[0];
      if (!user || !(await verifyPassword(password, user.password_hash))) return reply(res, 401, { error: "Invalid credentials" });
      const token = newToken();
      await pool.query("INSERT INTO app.sessions(token_hash,account_id,expires_at) VALUES ($1,$2,now()+interval '12 hours')", [tokenHash(token), user.id]);
      return reply(res, 200, { token, expiresInSeconds: 43200, user: { email: user.email } });
    }
    if (req.method === "GET" && path === "/auth/me") {
      const user = await accountFromToken(req);
      return user ? reply(res, 200, { user: { email: user.email } }) : reply(res, 401, { error: "Unauthorized" });
    }
    if (req.method === "POST" && path === "/auth/logout") {
      const auth = req.headers.authorization || "";
      if (auth.startsWith("Bearer ")) await pool.query("DELETE FROM app.sessions WHERE token_hash=$1", [tokenHash(auth.slice(7))]);
      return reply(res, 200, { status: "logged_out" });
    }
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
    if (req.method === "GET" && path === "/spaces") {
      const account = await accountFromToken(req);
      if (!account) return reply(res, 401, { error: "Unauthorized" });
      const local = await pool.query(
        `SELECT s.id, s.name, s.invite_code
         FROM app.shared_spaces s
         JOIN app.shared_space_members m ON m.space_id = s.id
         WHERE m.account_id = $1
         ORDER BY s.created_at ASC`,
        [account.id]
      );
      const spaces = local.rows.map(row => ({
        id: row.id,
        name: row.name,
        invite_code: row.invite_code
      }));
      const imported = await pool.query(
        "SELECT source_id,original_row FROM migration.imported_records WHERE entity_type='Space'"
      );
      for (const { source_id, original_row: row } of imported.rows) {
        try {
          const members = Array.isArray(row.member_emails)
            ? row.member_emails
            : JSON.parse(row.member_emails || "[]");
          if (members.some(email => normalizeEmail(email) === account.email)) {
            const mappedRoom = await pool.query(
              `SELECT s.invite_code
               FROM app.legacy_space_mappings lm
               JOIN app.shared_spaces s ON s.id = lm.local_space_id
               JOIN app.shared_space_members sm ON sm.space_id = s.id
               WHERE lm.legacy_space_id = $1
                 AND sm.account_id = $2
               LIMIT 1`,
              [source_id, account.id]
            );
            if (mappedRoom.rowCount) {
              spaces.push({
                id: source_id,
                name: row.name,
                invite_code: mappedRoom.rows[0].invite_code,
                member_names: Array.isArray(row.member_names)
                  ? row.member_names
                  : []
              });
            }
          }
        } catch {}
      }
      return reply(res, 200, { spaces });
    }
    if ((req.method === "GET" || req.method === "POST") && path.startsWith("/spaces/") && path.endsWith("/messages")) {
      const account = await accountFromToken(req);
      if (!account) return reply(res, 401, { error: "Unauthorized" });
      const parts = path.split("/");
      if (parts.length !== 4 || !/^[a-zA-Z0-9_-]{1,100}$/.test(parts[2])) return reply(res, 404, { error: "Not found" });
      const spaceId = parts[2];
      const found = await pool.query("SELECT original_row FROM migration.imported_records WHERE entity_type='Space' AND source_id=$1", [spaceId]);
      if (!found.rowCount) return reply(res, 404, { error: "Not found" });
      let members;
      try { const raw = found.rows[0].original_row.member_emails; members = Array.isArray(raw) ? raw : JSON.parse(raw || "[]"); } catch { members = []; }
      if (!Array.isArray(members) || !members.some(e => normalizeEmail(e) === account.email)) return reply(res, 404, { error: "Not found" });
      const mapping = await pool.query(
        "SELECT local_space_id FROM app.legacy_space_mappings WHERE legacy_space_id=$1",
        [spaceId]
      );
      if (!mapping.rowCount) {
        return reply(res, 404, { error: "Room mapping not found" });
      }
      const localSpaceId = mapping.rows[0].local_space_id;
      if (req.method === "POST") {
        const data = await bodyJson(req);
        const valid = (v, min, max) => typeof v === "string" && v.length >= min && v.length <= max && /^[A-Za-z0-9+/=]+$/.test(v);
        if (!valid(data.iv, 16, 32) || !valid(data.cipher, 20, 7000)) return reply(res, 400, { error: "Invalid encrypted payload" });
        const inserted = await pool.query(
          "INSERT INTO app.messages(space_id,account_id,cipher,iv) VALUES($1,$2,$3,$4) RETURNING id,created_at",
          [localSpaceId,account.id,data.cipher,data.iv]
        );
        return reply(res, 201, { id: "local-"+inserted.rows[0].id, createdDate: inserted.rows[0].created_at });
      }
      const [imported, recent] = await Promise.all([
        pool.query("SELECT source_id,original_row FROM migration.imported_records WHERE entity_type='Message' AND original_row->>'space_id'=$1 ORDER BY original_row->>'created_date' ASC LIMIT 500", [spaceId]),
        pool.query("SELECT m.id,m.cipher,m.iv,m.created_at,a.email FROM app.messages m JOIN app.accounts a ON a.id=m.account_id WHERE m.space_id=$1 ORDER BY m.created_at ASC,m.id ASC LIMIT 500", [localSpaceId])
      ]);
      const messages = imported.rows.map(({source_id,original_row:r}) => ({id:source_id,authorId:r.author_id,cipher:r.cipher,iv:r.iv,createdDate:r.created_date}));
      messages.push(...recent.rows.map(row => ({id:"local-"+row.id,authorId:row.email,cipher:row.cipher,iv:row.iv,createdDate:row.created_at})));
      return reply(res, 200, { spaceId, messages, encrypted: true });
    }
    if (/^\/spaces\/[A-Za-z0-9_-]{1,100}\/vault(?:\/items)?$/.test(path) && ["GET","POST"].includes(req.method)) {
      const account = await accountFromToken(req);
      if (!account) return reply(res,401,{error:"Unauthorized"});
      const spaceId = path.split("/")[2];
      const found = await pool.query("SELECT original_row FROM migration.imported_records WHERE entity_type='Space' AND source_id=$1",[spaceId]);
      if (!found.rowCount) return reply(res,404,{error:"Not found"});
      let members=[];
      try { members=JSON.parse(found.rows[0].original_row.member_emails||"[]"); } catch {}
      if (!Array.isArray(members)||!members.some(e=>normalizeEmail(e)===account.email)) return reply(res,404,{error:"Not found"});
      const isItems=path.endsWith("/items");
      const validB64=(s,max)=>typeof s==="string"&&s.length>10&&s.length<=max&&/^[A-Za-z0-9+/]+={0,2}$/.test(s);
      if (!isItems) {
        if (req.method==="POST") {
          const data=await bodyJson(req);
          if (data.version!==1||!validB64(data.kdfSalt,100)||!validB64(data.wrapIv,100)||!validB64(data.wrappedKey,200)) return reply(res,400,{error:"Invalid vault envelope"});
          const created=await pool.query("INSERT INTO app.space_vaults(space_id,kdf_salt,wrap_iv,wrapped_key) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING space_id",[spaceId,data.kdfSalt,data.wrapIv,data.wrappedKey]);
          if (!created.rowCount) return reply(res,409,{error:"Vault already initialized"});
          return reply(res,201,{status:"created"});
        }
        const data=await pool.query("SELECT version,kdf_salt,wrap_iv,wrapped_key FROM app.space_vaults WHERE space_id=$1",[spaceId]);
        return reply(res,200,data.rowCount?{initialized:true,version:data.rows[0].version,kdfSalt:data.rows[0].kdf_salt,wrapIv:data.rows[0].wrap_iv,wrappedKey:data.rows[0].wrapped_key}:{initialized:false});
      }
      if (req.method==="POST") {
        const data=await bodyJson(req);
        if (!["note","memory","file","photo","audio","canvas","other"].includes(data.kind)||!validB64(data.iv,100)||!validB64(data.cipher,8000)) return reply(res,400,{error:"Invalid encrypted item"});
        const result=await pool.query("INSERT INTO app.vault_items(space_id,account_id,kind,iv,cipher) VALUES($1,$2,$3,$4,$5) RETURNING id,created_at",[spaceId,account.id,data.kind,data.iv,data.cipher]);
        return reply(res,201,{id:result.rows[0].id,createdDate:result.rows[0].created_at});
      }
      const items=await pool.query("SELECT id,kind,iv,cipher,created_at FROM app.vault_items WHERE space_id=$1 ORDER BY created_at ASC,id ASC LIMIT 200",[spaceId]);
      return reply(res,200,{items:items.rows.map(x=>({id:x.id,kind:x.kind,iv:x.iv,cipher:x.cipher,createdDate:x.created_at}))});
    }
    if (req.method==="GET" && /^\/spaces\/[A-Za-z0-9_-]{1,100}\/overview$/.test(path)) {
      const account=await accountFromToken(req);
      if(!account)return reply(res,401,{error:"Unauthorized"});
      const spaceId=path.split("/")[2];
      const found=await pool.query("SELECT original_row FROM migration.imported_records WHERE entity_type='Space' AND source_id=$1",[spaceId]);
      if(!found.rowCount)return reply(res,404,{error:"Not found"});
      let members=[];try{members=JSON.parse(found.rows[0].original_row.member_emails||"[]")}catch{}
      if(!Array.isArray(members)||!members.some(e=>normalizeEmail(e)===account.email))return reply(res,404,{error:"Not found"});
      const counts=await pool.query("SELECT entity_type,count(*)::int AS total FROM migration.imported_records WHERE entity_type IN ('Message','Photo','Memory','Media','CanvasDoc','ReadingDoc','VoiceNote','Note','Mood','SleepTrack','Goodnight','Heart','CodexEntry') AND original_row->>'space_id'=$1 GROUP BY entity_type",[spaceId]);
      const fresh=await pool.query("SELECT count(*)::int AS total FROM app.messages WHERE space_id=$1",[spaceId]);
      const vault=await pool.query("SELECT count(*)::int AS total FROM app.vault_items WHERE space_id=$1",[spaceId]);
      return reply(res,200,{spaceId,name:found.rows[0].original_row.name||"Our Little Space",counts:Object.fromEntries(counts.rows.map(x=>[x.entity_type,x.total])),newMessages:fresh.rows[0].total,encryptedVaultItems:vault.rows[0].total});
    }
    // Safe migration inventory: metadata only, never original_row or ciphertext.
    if (req.method==="GET" && /^\/spaces\/[A-Za-z0-9_-]{1,100}\/inventory$/.test(path)) {
      const account=await accountFromToken(req);
      if(!account)return reply(res,401,{error:"Unauthorized"});
      const spaceId=path.split("/")[2];
      const space=await pool.query("SELECT original_row FROM migration.imported_records WHERE entity_type='Space' AND source_id=$1",[spaceId]);
      if(!space.rowCount)return reply(res,404,{error:"Not found"});
      let members=[];
      try{members=JSON.parse(space.rows[0].original_row.member_emails||"[]")}catch{}
      if(!Array.isArray(members)||!members.some(e=>normalizeEmail(e)===account.email))return reply(res,404,{error:"Not found"});
      const data=await pool.query("SELECT entity_type, count(*)::int AS total, count(*) FILTER (WHERE original_row->>'space_id'=$1)::int AS linked FROM migration.imported_records WHERE entity_type NOT IN ('User','Space') GROUP BY entity_type ORDER BY entity_type",[spaceId]);
      return reply(res,200,{spaceId,collections:data.rows.map(x=>({type:x.entity_type,imported:x.total,linked:x.linked,unlinked:x.total-x.linked})),note:"Metadata inventory only. Imported media records do not confirm that their original binary files are present."});
    }
    if (req.method === "GET" && path === "/migration/status") {
      // Keep this local diagnostic endpoint free of private record contents.
      const result = await pool.query("SELECT entity_type, count(*)::int AS records FROM migration.imported_records GROUP BY entity_type ORDER BY entity_type");
      return reply(res, 200, { status: "ok", totalRecords: result.rows.reduce((n,r)=>n+r.records,0), collections: result.rows });
    }
    return reply(res, 404, { error: "Not found" });
  } catch (error) {
    console.error("Request failed:", error.message);
    return reply(res, error instanceof SyntaxError ? 400 : 500, { error: "Request failed" });
  }
});
server.listen(4000, "0.0.0.0", () => console.log("SyncSpace API listening on port 4000"));
process.on("SIGTERM", () => server.close(() => pool.end()));

