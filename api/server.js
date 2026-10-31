import http from "node:http";
import pg from "pg";
import {handleCalling} from "./calling.js";
import {handleMessages} from "./messaging.js";
import { normalizeEmail, verifyPassword, newToken, tokenHash } from "./auth.js";
const pool = new pg.Pool({ host: process.env.PGHOST || "db", port: Number(process.env.PGPORT || 5432), database: process.env.PGDATABASE || "syncspace", user: process.env.PGUSER || "syncspace", password: process.env.PGPASSWORD, max: 5 });
function reply(res, status, data) { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }); res.end(JSON.stringify(data)); }
async function bodyJson(req) {
  let text = "";
  for await (const chunk of req) { text += chunk; if (text.length > 20000) throw new Error("Request too large"); }
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
    if (req.method === "GET" && path === "/spaces") {
      const account = await accountFromToken(req);
      if (!account) return reply(res, 401, { error: "Unauthorized" });
      const rows = await pool.query("SELECT source_id,original_row FROM migration.imported_records WHERE entity_type='Space'");
      const spaces = rows.rows.filter(({original_row: row}) => {
        try {
          const members = JSON.parse(row.member_emails || "[]");
          return Array.isArray(members) && members.some(e => normalizeEmail(e) === account.email);
        } catch { return false; }
      }).map(({source_id,original_row:row}) => ({id:source_id,name:row.name}));
      return reply(res, 200, { spaces });
    }
    if (await handleCalling({req,res,url:new URL(req.url,"http://localhost"),pool,accountFromToken,reply,bodyJson})) return;
    if (await handleMessages({req,res,url:new URL(req.url,"http://localhost"),pool,accountFromToken,reply,bodyJson})) return;
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
    console.error("Request failed", {code: error.code || "REQUEST_ERROR"});
    return reply(res, error instanceof SyntaxError ? 400 : 500, { error: "Request failed" });
  }
});
server.listen(4000, "0.0.0.0", () => console.log("SyncSpace API listening on port 4000"));
process.on("SIGTERM", () => server.close(() => pool.end()));
