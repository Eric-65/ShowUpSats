import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { handle, UserError } from "@/lib/server/errors";
import { onboardingProfileSchema } from "@/lib/validation";
import { policyHash, randomToken, sha256Hex } from "@/lib/server/crypto";
import { setSession } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/ratelimit";
import { clientIp, readJson } from "@/lib/server/request";
import { generateDefaultSlots } from "@/lib/server/slots";

export async function POST(req: Request) {
  try {
    if (!(await rateLimit(`onboard:${await clientIp()}`, 5, 60 * 60_000))) throw new UserError("Too many sign-ups from this network. Try again later.", 429, "RATE_LIMIT");
    const d = onboardingProfileSchema.parse(await readJson(req));
    if (d.services.some((s) => s.depositFiat > s.priceFiat)) throw new UserError("A deposit can't be bigger than the service price.");
    if (await db.provider.findUnique({ where: { slug: d.slug } })) throw new UserError("That link name is taken. Try another.", 409, "SLUG_TAKEN");
    const key = randomToken(16); // 128-bit, shown once
    const p = await db.provider.create({
      data: {
        displayName: d.displayName, slug: d.slug, currency: d.currency, language: d.language,
        cancelNoticeHours: d.cancelNoticeHours, policyText: d.policyText, policyHash: policyHash(d.policyText),
        dashboardKeyHash: sha256Hex(key),
        services: { create: d.services },
      },
    });
    await generateDefaultSlots(p.id);
    await setSession(p.id);
    return NextResponse.json({ ok: true, slug: p.slug, dashboardKey: key });
  } catch (e) { return handle(e); }
}
