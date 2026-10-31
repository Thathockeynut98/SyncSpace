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
  if (path !== "/health" && path !== "/migration/status") {
    res.writeHead(404);
    return res.end(JSON.stringify({ error: "Not found" }));
  }
  try {
    if (path === "/migration/status") {
      // Counts only; never return private row contents or account identifiers.
      const result = await pool.query(
        "SELECT entity_type, count(*)::int AS records FROM migration.imported_records GROUP BY entity_type ORDER BY entity_type"
      );
      res.writeHead(200);
      return res.end(JSON.stringify({
        status: "ok",
        totalRecords: result.rows.reduce((sum, row) => sum + row.records, 0),
        collections: result.rows,
        note: "Staging records only; app authentication and data APIs are not enabled."
      }));
    }
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
