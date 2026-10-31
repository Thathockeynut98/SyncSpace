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
