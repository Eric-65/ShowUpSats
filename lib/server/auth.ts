import { cookies } from "next/headers";
import { createHmac } from "node:crypto";
import { db } from "./db";
import { sha256Hex, safeEqualHex } from "./crypto";
import { UserError } from "./errors";

const COOKIE = "sus_session";
const MAX_AGE = 60 * 60 * 24 * 14;

function sign(value: string) {
  return createHmac("sha256", process.env.ENCRYPTION_KEY!).update(value).digest("hex");
}
export async function setSession(providerId: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const v = `${providerId}.${exp}`;
  (await cookies()).set(COOKIE, `${v}.${sign(v)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: MAX_AGE });
}
export async function clearSession() { (await cookies()).delete(COOKIE); }

export async function currentProviderId(): Promise<string | null> {
  const c = (await cookies()).get(COOKIE)?.value;
  if (!c) return null;
  const [id, exp, sig] = c.split(".");
  if (!id || !exp || !sig) return null;
  if (!safeEqualHex(sig, sign(`${id}.${exp}`))) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return id;
}
export async function requireProvider() {
  const id = await currentProviderId();
  if (!id) throw new UserError("Please log in with your dashboard key.", 401, "UNAUTHORIZED");
  const p = await db.provider.findUnique({ where: { id } });
  if (!p) throw new UserError("Please log in with your dashboard key.", 401, "UNAUTHORIZED");
  return p;
}
export async function loginWithKey(slug: string, key: string) {
  const p = await db.provider.findUnique({ where: { slug } });
  if (!p || !safeEqualHex(p.dashboardKeyHash, sha256Hex(key.trim()))) throw new UserError("That link name or dashboard key is wrong.", 401, "BAD_KEY");
  await setSession(p.id);
  return p;
}
