import { cookies } from "next/headers";
import { createHmac, randomBytes, createHash } from "node:crypto";
import type { Member } from "@prisma/client";
import { db } from "./db";
import { safeEqualHex } from "./crypto";

/* ---------------- member session (separate from the provider dashboard session) ---------------- */
const SESSION = "sus_member";
const MAX_AGE = 60 * 60 * 24 * 30;
export const REF_COOKIE = "sus_ref";
export const OAUTH_COOKIE = "sus_oauth";
const secure = process.env.NODE_ENV === "production";

export function sign(value: string) {
  return createHmac("sha256", process.env.ENCRYPTION_KEY!).update(`member:${value}`).digest("hex");
}
export function sealed(value: string) { return `${value}.${sign(value)}`; }
export function unseal(raw: string | undefined): string | null {
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  if (i < 0) return null;
  const v = raw.slice(0, i), sig = raw.slice(i + 1);
  return /^[0-9a-f]{64}$/.test(sig) && safeEqualHex(sig, sign(v)) ? v : null;
}

export async function setMemberSession(memberId: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  // SameSite=lax so the cookie survives the redirect back from Google
  (await cookies()).set(SESSION, sealed(`${memberId}|${exp}`), { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: MAX_AGE });
}
export async function clearMemberSession() { (await cookies()).delete(SESSION); }

export async function currentMember(): Promise<Member | null> {
  const v = unseal((await cookies()).get(SESSION)?.value);
  if (!v) return null;
  const [id, exp] = v.split("|");
  if (!id || Number(exp) < Date.now() / 1000) return null;
  return db.member.findUnique({ where: { id } }).catch(() => null);
}

/* ---------------- OAuth helpers (PKCE + state) ---------------- */
export function newOAuthState() {
  const state = randomBytes(16).toString("hex");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { state, verifier, challenge };
}

/* ---------------- referral codes ---------------- */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
export function newRefCode(len = 8) {
  const b = randomBytes(len);
  return Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join("");
}
export const isRefCode = (c: string | undefined | null): c is string => !!c && /^[A-Z2-9]{6,12}$/.test(c);

/** Create the member on first sign-in (attributing the referral once), or refresh their profile. */
export async function upsertFromGoogle(p: { sub: string; email: string; name: string; picture?: string }, refCode?: string | null) {
  const existing = await db.member.findUnique({ where: { googleSub: p.sub } });
  if (existing) {
    const m = await db.member.update({ where: { id: existing.id }, data: { name: p.name, avatarUrl: p.picture ?? existing.avatarUrl, email: p.email, lastSeenAt: new Date() } });
    return { member: m, isNew: false };
  }
  let referredById: string | null = null;
  if (isRefCode(refCode)) {
    const ref = await db.member.findUnique({ where: { refCode }, select: { id: true, email: true } });
    if (ref && ref.email !== p.email) referredById = ref.id; // can't refer yourself
  }
  for (let i = 0; i < 5; i++) {
    try {
      const m = await db.member.create({ data: { googleSub: p.sub, email: p.email, name: p.name, avatarUrl: p.picture ?? null, refCode: newRefCode(), referredById } });
      return { member: m, isNew: true };
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
      const again = await db.member.findUnique({ where: { googleSub: p.sub } }); // raced with another tab
      if (again) return { member: again, isNew: false };
    }
  }
  throw new Error("could not allocate referral code");
}

/** Public display name: first name + last initial. Never the email. */
export function publicName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Member";
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

/* ---------------- community stats ---------------- */
export async function communityStats() {
  const DAY = 86_400_000;
  const since14 = new Date(Date.now() - 13 * DAY); since14.setUTCHours(0, 0, 0, 0);
  const [total, week, viaInvite, recent, wall, topRaw] = await Promise.all([
    db.member.count(),
    db.member.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * DAY) } } }),
    db.member.count({ where: { referredById: { not: null } } }),
    db.member.findMany({ where: { createdAt: { gte: since14 } }, select: { createdAt: true } }),
    db.member.findMany({ where: { showInCommunity: true }, orderBy: { createdAt: "desc" }, take: 60,
      select: { id: true, name: true, avatarUrl: true, createdAt: true, _count: { select: { referrals: true } } } }),
    db.member.findMany({ where: { referrals: { some: {} } }, orderBy: { referrals: { _count: "desc" } }, take: 10,
      select: { id: true, name: true, avatarUrl: true, showInCommunity: true, _count: { select: { referrals: true } } } }),
  ]);
  const days: { day: string; count: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(since14.getTime() + i * DAY);
    const key = d.toISOString().slice(0, 10);
    days.push({ day: key, count: recent.filter((r) => r.createdAt.toISOString().slice(0, 10) === key).length });
  }
  return {
    total, week, viaInvite, days,
    wall: wall.map((m) => ({ id: m.id, name: publicName(m.name), avatarUrl: m.avatarUrl, joined: m.createdAt.toISOString(), referrals: m._count.referrals })),
    top: topRaw.map((m) => ({ id: m.id, name: m.showInCommunity ? publicName(m.name) : "A member", avatarUrl: m.showInCommunity ? m.avatarUrl : null, referrals: m._count.referrals })),
  };
}
