import { NextResponse } from "next/server";
import { handle, UserError } from "@/lib/server/errors";
import { loginSchema } from "@/lib/validation";
import { loginWithKey } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/ratelimit";
import { clientIp, readJson } from "@/lib/server/request";

export async function POST(req: Request) {
  try {
    if (!(await rateLimit(`login:${await clientIp()}`, 10, 15 * 60_000))) throw new UserError("Too many tries. Wait 15 minutes.", 429, "RATE_LIMIT");
    const { slug, key } = loginSchema.parse(await readJson(req));
    const p = await loginWithKey(slug, key);
    return NextResponse.json({ ok: true, slug: p.slug });
  } catch (e) { return handle(e); }
}
