import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { REF_COOKIE, setMemberSession, upsertFromGoogle } from "@/lib/server/members";

/** LOCAL DEVELOPMENT ONLY: fake Google sign-in for testing. Always 404 in production. */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEV_LOGIN !== "1") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const q = new URL(req.url).searchParams;
  const name = (q.get("name") || "Test User").slice(0, 60);
  const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@example.test`;
  const jar = await cookies();
  const { member, isNew } = await upsertFromGoogle({ sub: `dev:${email}`, email, name }, jar.get(REF_COOKIE)?.value);
  await setMemberSession(member.id);
  if (isNew) jar.delete(REF_COOKIE);
  return NextResponse.redirect(new URL(isNew ? "/me?welcome=1" : "/me", req.url), 303);
}
