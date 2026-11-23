import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { isRefCode, REF_COOKIE } from "@/lib/server/members";

/** Invite link: /i/K7Q2M9XA → remembers who invited you (30 days), then shows the join page. */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = (await ctx.params).code.toUpperCase();
  const res = NextResponse.redirect(new URL(isRefCode(code) ? `/join?ref=${code}` : "/join", req.url), 303);
  if (!isRefCode(code)) return res;
  const ok = await db.member.update({ where: { refCode: code }, data: { inviteClicks: { increment: 1 } } }).then(() => true, () => false);
  if (ok) res.cookies.set(REF_COOKIE, code, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
