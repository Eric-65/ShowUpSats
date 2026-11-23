import { NextResponse } from "next/server";
import { newOAuthState, OAUTH_COOKIE, sealed } from "@/lib/server/members";
import { googleConfigured, redirectUri } from "@/lib/server/google";
import { rateLimit } from "@/lib/server/ratelimit";
import { clientIp } from "@/lib/server/request";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  if (!googleConfigured()) return NextResponse.redirect(new URL("/join?error=not_configured", req.url), 303);
  if (!(await rateLimit(`oauth:${await clientIp()}`, 30, 10 * 60_000))) return NextResponse.redirect(new URL("/join?error=rate_limited", req.url), 303);
  const { state, verifier, challenge } = newOAuthState();
  const next = new URL(req.url).searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/me";
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: await redirectUri(), response_type: "code",
    scope: "openid email profile", state, code_challenge: challenge, code_challenge_method: "S256", prompt: "select_account",
  }).toString();
  const res = NextResponse.redirect(url, 303);
  res.cookies.set(OAUTH_COOKIE, sealed(`${state}|${verifier}|${safeNext}`), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
