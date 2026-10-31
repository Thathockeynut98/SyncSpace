import http from "node:http";
import pg from "pg";

const pool = new pg.Pool({
  host: process.env.PGHOST || "db",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "syncspace",
  user: process.env.PGUSER || "syncspace",
  password: process.env.PGPASSWORD,
  max: 5,
});

const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.writeHead(405);
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }
  if (path !== "/health") {
    res.writeHead(404);
    return res.end(JSON.stringify({ error: "Not found" }));
  }
  try {
    await pool.query("SELECT 1");
    res.writeHead(200);
    res.end(JSON.stringify({ status: "ok", database: "connected", service: "syncspace-api" }));
  } catch (error) {
    console.error("Health check failed:", error.message);
    res.writeHead(503);
    res.end(JSON.stringify({ status: "unavailable", database: "disconnected" }));
  }
});

server.listen(4000, "0.0.0.0", () => console.log("SyncSpace API listening on port 4000"));
process.on("SIGTERM", () => server.close(() => pool.end()));
