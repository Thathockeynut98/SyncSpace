import pg from "pg";
import { readFileSync } from "node:fs";
import { normalizeEmail, hashPassword } from "./auth.js";

const email=normalizeEmail(process.env.SYNCSPACE_ACCOUNT_EMAIL);
if(!email||!email.includes("@")) throw new Error("Provide collaborator email using SYNCSPACE_ACCOUNT_EMAIL");
const password=readFileSync(0,"utf8").replace(/\r?\n$/,"");
const passwordHash=await hashPassword(password);
const pool=new pg.Pool();
try {
  const imported=await pool.query("SELECT 1 FROM migration.imported_records WHERE entity_type='User' AND lower(original_row->>'email')=$1 LIMIT 1",[email]);
  if(!imported.rowCount) throw new Error("Account email must match an original imported SyncSpace user");
  const spaces=await pool.query("SELECT original_row->>'member_emails' AS emails FROM migration.imported_records WHERE entity_type='Space'");
  const authorized=spaces.rows.some(row=>{
    try {return JSON.parse(row.emails||"[]").some(member=>normalizeEmail(member)===email)}catch{return false}
  });
  if(!authorized) throw new Error("Imported user is not listed as a member of any shared space");
  const result=await pool.query("INSERT INTO app.accounts(email,password_hash) VALUES($1,$2) ON CONFLICT(email) DO NOTHING RETURNING id",[email,passwordHash]);
  if(!result.rowCount) throw new Error("Account already exists; no credentials were changed");
  console.log("Collaborator account created. Existing accounts and sessions unchanged.");
} finally {await pool.end()}
