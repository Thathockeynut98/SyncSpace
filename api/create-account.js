import pg from "pg";
import { normalizeEmail, hashPassword } from "./auth.js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
const email = normalizeEmail(process.env.SYNCSPACE_ACCOUNT_EMAIL);
if (!email || !email.includes("@")) throw new Error("Set SYNCSPACE_ACCOUNT_EMAIL to an imported user's email");
const rl = createInterface({ input: stdin, output: stdout, terminal: true });
try {
  const password = await rl.question("New local password (12+ characters, visible while typing): ");
  const hash = await hashPassword(password);
  const pool = new pg.Pool();
  try {
    const imported = await pool.query(
      "SELECT 1 FROM migration.imported_records WHERE entity_type = 'User' AND lower(original_row->>'email') = $1 LIMIT 1",
      [email]
    );
    if (!imported.rowCount) throw new Error("Email does not match an imported SyncSpace user");
    await pool.query("INSERT INTO app.accounts(email,password_hash) VALUES ($1,$2) ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash", [email, hash]);
    await pool.query("DELETE FROM app.sessions WHERE account_id = (SELECT id FROM app.accounts WHERE email=$1)", [email]);
    console.log("Local account configured; previous sessions revoked.");
  } finally { await pool.end(); }
} finally { rl.close(); }
