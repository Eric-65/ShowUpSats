import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { handle } from "@/lib/server/errors";
import { requireProvider } from "@/lib/server/auth";
import { encrypt } from "@/lib/server/crypto";
import { nwcUri } from "@/lib/validation";
import { verifyReceiveConnection, verifyRefundConnection } from "@/lib/server/onboarding";
import { readJson } from "@/lib/server/request";

const schema = z.object({ kind: z.enum(["receive", "refund"]), uri: nwcUri });

export async function POST(req: Request) {
  try {
    const p = await requireProvider();
    const { kind, uri } = schema.parse(await readJson(req));
    if (kind === "receive") {
      const r = await verifyReceiveConnection(uri);
      await db.provider.update({ where: { id: p.id }, data: { nwcReceiveEnc: encrypt(uri) } });
      return NextResponse.json({ ok: true, methods: r.methods, warning: r.warning ?? null });
    }
    const r = await verifyRefundConnection(uri);
    await db.provider.update({ where: { id: p.id }, data: { nwcRefundEnc: encrypt(uri) } });
    return NextResponse.json({ ok: true, methods: r.methods, budget: r.budget, warning: r.warning ?? null });
  } catch (e) { return handle(e); }
}
