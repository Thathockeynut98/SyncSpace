import {handleEntities} from "./entities.js";
import {attachRealtime} from "./realtime.js";
import {resolveSpace,listSpaces} from "./spaces.js";
import {handleSpaces} from "./spaces.js";
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
// Only explicitly approved browser origins may make cross-origin API requests.
// Configure a comma-separated SYNCSPACE_ALLOWED_ORIGINS on the API host.
// This is a browser boundary, not a replacement for authentication.
const allowedOrigins = new Set(
  [
    "http://127.0.0.1:3003",
    "http://localhost:3003",
    "http://127.0.0.1:3001",
    "http://localhost:3001",
    ...(process.env.SYNCSPACE_ALLOWED_ORIGINS || "").split(","),
  ]
    .map((origin) => origin.trim())
    .filter((origin) => {
      try {
        const parsed = new URL(origin);
        return (parsed.protocol === "https:" || (parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname))) &&
          parsed.origin === origin;
      } catch {
        return false;
      }
    })
);
const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Vary", "Origin");
    if (!allowedOrigins.has(origin)) {
      return reply(res, 403, { error: "Origin not allowed" });
    }
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Max-Age", "600");
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Cache-Control": "no-store" });
    return res.end();
  }
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
      return reply(res, 200, { token, expiresInSeconds: 43200, user: { id: String(user.id), email: user.email } });
    }
    if (req.method === "GET" && path === "/auth/me") {
      const user = await accountFromToken(req);
      return user ? reply(res, 200, { user: { id: String(user.id), email: user.email } }) : reply(res, 401, { error: "Unauthorized" });
    }
    if (req.method === "POST" && path === "/auth/logout") {
      const auth = req.headers.authorization || "";
      if (auth.startsWith("Bearer ")) { const hash=tokenHash(auth.slice(7)); await pool.query("DELETE FROM app.sessions WHERE token_hash=$1", [hash]); realtime.revoke(hash); }
      return reply(res, 200, { status: "logged_out" });
    }
    if(path==='/spaces'||path==='/spaces/join') { await handleSpaces({req,res,path,pool,accountFromToken,reply,bodyJson}); if(!res.writableEnded)reply(res,405,{error:'Method not allowed'}); return; }
    if (await handleEntities({req,res,url:new URL(req.url,"http://localhost"),pool,accountFromToken,reply,bodyJson})) return;
    if (await handleCalling({req,res,url:new URL(req.url,"http://localhost"),pool,accountFromToken,reply,bodyJson})) return;
    if (await handleMessages({req,res,url:new URL(req.url,"http://localhost"),pool,accountFromToken,reply,bodyJson})) return;
    if (/^\/spaces\/[A-Za-z0-9_-]{1,100}\/vault(?:\/items)?$/.test(path) && ["GET","POST"].includes(req.method)) {
      const account = await accountFromToken(req);
      if (!account) return reply(res,401,{error:"Unauthorized"});
      const resolved=await resolveSpace(pool,path.split('/')[2],account);
      if(!resolved)return reply(res,404,{error:'Not found'});
      const spaceId=resolved.id;
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
      const resolved=await resolveSpace(pool,path.split('/')[2],account);
      if(!resolved)return reply(res,404,{error:'Not found'});
      const spaceId=resolved.id;
      const counts=await pool.query("SELECT entity_type,count(*)::int AS total FROM migration.imported_records WHERE entity_type IN ('Message','Photo','Memory','Media','CanvasDoc','ReadingDoc','VoiceNote','Note','Mood','SleepTrack','Goodnight','Heart','CodexEntry') AND original_row->>'space_id'=$1 GROUP BY entity_type",[spaceId]);
      const fresh=await pool.query("SELECT count(*)::int AS total FROM app.messages WHERE space_id::text=ANY($1)",[resolved.sourceIds]);
      const vault=await pool.query("SELECT count(*)::int AS total FROM app.vault_items WHERE space_id=$1",[spaceId]);
      return reply(res,200,{spaceId,name:resolved.name||"Our Little Space",counts:Object.fromEntries(counts.rows.map(x=>[x.entity_type,x.total])),newMessages:fresh.rows[0].total,encryptedVaultItems:vault.rows[0].total});
    }
    // Safe migration inventory: metadata only, never original_row or ciphertext.
    if (req.method==="GET" && /^\/spaces\/[A-Za-z0-9_-]{1,100}\/inventory$/.test(path)) {
      const account=await accountFromToken(req);
      if(!account)return reply(res,401,{error:"Unauthorized"});
      const resolved=await resolveSpace(pool,path.split('/')[2],account);
      if(!resolved)return reply(res,404,{error:'Not found'});
      const spaceId=resolved.id;
      const data=await pool.query("SELECT entity_type, count(*)::int AS total, count(*) FILTER (WHERE original_row->>'space_id'=$1)::int AS linked FROM migration.imported_records WHERE entity_type NOT IN ('User','Space') AND original_row->>'space_id'=$1 GROUP BY entity_type ORDER BY entity_type",[spaceId]);
      return reply(res,200,{spaceId,collections:data.rows.map(x=>({type:x.entity_type,imported:x.total,linked:x.linked,unlinked:x.total-x.linked})),note:"Metadata inventory only. Imported media records do not confirm that their original binary files are present."});
    }
    if (req.method === "GET" && path === "/migration/status") {
      const account=await accountFromToken(req);
      if(!account)return reply(res,401,{error:'Unauthorized'});
      const ids=(await listSpaces(pool,account)).map(s=>s.id);
      // Keep this local diagnostic endpoint free of private record contents.
      const result = await pool.query("SELECT entity_type, count(*)::int AS records FROM migration.imported_records WHERE original_row->>'space_id'=ANY($1) GROUP BY entity_type ORDER BY entity_type",[ids]);
      return reply(res, 200, { status: "ok", totalRecords: result.rows.reduce((n,r)=>n+r.records,0), collections: result.rows });
    }
    return reply(res, 404, { error: "Not found" });
  } catch (error) {
    console.error("Request failed", {code: error.code || "REQUEST_ERROR"});
    return reply(res, error instanceof SyntaxError ? 400 : 500, { error: "Request failed" });
  }
});
const realtime=attachRealtime(server,pool,accountFromToken);
server.listen(Number(process.env.PORT||4000), "0.0.0.0", () => console.log("SyncSpace API listening on port 4000"));
process.on("SIGTERM", () => server.close(() => pool.end()));
