import { NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/config";
import { db } from "@/lib/server/db";
import { demoMarkPaid } from "@/lib/server/wallet";
import { id as idSchema } from "@/lib/validation";

/** DEMO_MODE only: simulate the client paying. 404 otherwise. */
export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!DEMO_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await db.booking.findUnique({ where: { id: idSchema.parse((await ctx.params).id) } });
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
  demoMarkPaid(b.paymentHash);
  return NextResponse.json({ ok: true, simulated: true });
}
