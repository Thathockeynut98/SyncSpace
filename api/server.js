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
    if ((req.method === "GET" || req.method === "POST") && path.startsWith("/spaces/") && path.endsWith("/messages")) {
      const account = await accountFromToken(req);
      if (!account) return reply(res, 401, { error: "Unauthorized" });
      const parts = path.split("/");
      if (parts.length !== 4 || !/^[a-zA-Z0-9_-]{1,100}$/.test(parts[2])) return reply(res, 404, { error: "Not found" });
      const spaceId = parts[2];
      const found = await pool.query("SELECT original_row FROM migration.imported_records WHERE entity_type='Space' AND source_id=$1", [spaceId]);
      if (!found.rowCount) return reply(res, 404, { error: "Not found" });
      let members;
      try { members = JSON.parse(found.rows[0].original_row.member_emails || "[]"); } catch { members = []; }
      if (!Array.isArray(members) || !members.some(e => normalizeEmail(e) === account.email)) return reply(res, 404, { error: "Not found" });
      if (req.method === "POST") {
        const data = await bodyJson(req);
        const valid = (v, min, max) => typeof v === "string" && v.length >= min && v.length <= max && /^[A-Za-z0-9+/=]+$/.test(v);
        if (!valid(data.iv, 16, 32) || !valid(data.cipher, 20, 7000)) return reply(res, 400, { error: "Invalid encrypted payload" });
        const inserted = await pool.query(
          "INSERT INTO app.messages(space_id,account_id,cipher,iv) VALUES($1,$2,$3,$4) RETURNING id,created_at",
          [spaceId,account.id,data.cipher,data.iv]
        );
        return reply(res, 201, { id: "local-"+inserted.rows[0].id, createdDate: inserted.rows[0].created_at });
      }
      const [imported, recent] = await Promise.all([
        pool.query("SELECT source_id,original_row FROM migration.imported_records WHERE entity_type='Message' AND original_row->>'space_id'=$1 ORDER BY original_row->>'created_date' ASC LIMIT 500", [spaceId]),
        pool.query("SELECT m.id,m.cipher,m.iv,m.created_at,a.email FROM app.messages m JOIN app.accounts a ON a.id=m.account_id WHERE m.space_id=$1 ORDER BY m.created_at ASC,m.id ASC LIMIT 500", [spaceId])
      ]);
      const messages = imported.rows.map(({source_id,original_row:r}) => ({id:source_id,authorId:r.author_id,cipher:r.cipher,iv:r.iv,createdDate:r.created_date}));
      messages.push(...recent.rows.map(row => ({id:"local-"+row.id,authorId:row.email,cipher:row.cipher,iv:row.iv,createdDate:row.created_at})));
      return reply(res, 200, { spaceId, messages, encrypted: true });
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
