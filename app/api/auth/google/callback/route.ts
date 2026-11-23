import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAUTH_COOKIE, REF_COOKIE, setMemberSession, unseal, upsertFromGoogle } from "@/lib/server/members";
import { googleConfigured, redirectUri } from "@/lib/server/google";
import { withTimeout } from "@/lib/server/nwc";

export const dynamic = "force-dynamic";
const fail = (req: Request, code: string) => NextResponse.redirect(new URL(`/join?error=${code}`, req.url), 303);

/**
 * Google OAuth callback (authorization code + PKCE).
 * The id_token comes straight from Google's token endpoint over TLS, authenticated with our client secret,
 * so per OpenID Connect §3.1.3.7 we validate iss/aud/exp and trust the claims.
 */
export async function GET(req: Request) {
  if (!googleConfigured()) return fail(req, "not_configured");
  const q = new URL(req.url).searchParams;
  if (q.get("error")) return fail(req, "cancelled");
  const jar = await cookies();
  const saved = unseal(jar.get(OAUTH_COOKIE)?.value);
  jar.delete(OAUTH_COOKIE);
  if (!saved) return fail(req, "expired");
  const [state, verifier, next] = saved.split("|");
  if (!q.get("code") || q.get("state") !== state) return fail(req, "state");

  let claims: { iss?: string; aud?: string; exp?: number; sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string };
  try {
    const r = await withTimeout(fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code: q.get("code")!, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: await redirectUri(), grant_type: "authorization_code", code_verifier: verifier }),
    }), 10_000, "google");
    const tok = await r.json();
    if (!r.ok || !tok.id_token) { console.error("[google] token exchange failed", r.status, tok.error); return fail(req, "token"); }
    claims = JSON.parse(Buffer.from(String(tok.id_token).split(".")[1], "base64url").toString("utf8"));
  } catch (e) { console.error("[google] token error", (e as Error).message); return fail(req, "token"); }

  const issOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  if (!issOk || claims.aud !== process.env.GOOGLE_CLIENT_ID || !claims.exp || claims.exp * 1000 < Date.now() || !claims.sub || !claims.email) return fail(req, "token");
  if (claims.email_verified === false) return fail(req, "unverified");

  const ref = jar.get(REF_COOKIE)?.value;
  const { member, isNew } = await upsertFromGoogle({ sub: claims.sub, email: claims.email.toLowerCase(), name: claims.name || claims.email.split("@")[0], picture: claims.picture }, ref);
  await setMemberSession(member.id);
  if (isNew) jar.delete(REF_COOKIE);
  const dest = new URL(isNew ? "/me?welcome=1" : next || "/me", req.url);
  return NextResponse.redirect(dest, 303);
}
