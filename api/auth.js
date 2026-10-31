import crypto from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(crypto.scrypt);
export const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
export async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 12 || password.length > 256) throw new Error("Password must be 12-256 characters");
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return "scrypt:" + salt.toString("hex") + ":" + key.toString("hex");
}
export async function verifyPassword(password, stored) {
  if (!stored?.startsWith("scrypt:") || typeof password !== "string") return false;
  const [, saltHex, hashHex] = stored.split(":");
  if (!/^[a-f0-9]{32}$/.test(saltHex) || !/^[a-f0-9]{128}$/.test(hashHex)) return false;
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), 64);
  return crypto.timingSafeEqual(actual, Buffer.from(hashHex, "hex"));
}
export function newToken() { return crypto.randomBytes(32).toString("base64url"); }
export function tokenHash(token) { return crypto.createHash("sha256").update(token).digest("hex"); }
