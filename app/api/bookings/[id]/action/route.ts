import { NextResponse } from "next/server";
import { handle, UserError } from "@/lib/server/errors";
import { requireProvider } from "@/lib/server/auth";
import { actionSchema, id as idSchema } from "@/lib/validation";
import * as B from "@/lib/server/bookings";
import { rateLimit } from "@/lib/server/ratelimit";
import { readJson } from "@/lib/server/request";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const p = await requireProvider();
    const id = idSchema.parse((await ctx.params).id);
    const a = actionSchema.parse(await readJson(req));
    let result: unknown;
    switch (a.action) {
      case "accept": result = await B.acceptBooking(p, id); break;
      case "decline": result = await B.declineBooking(p, id); break;
      case "checkin":
        if (!a.code) throw new UserError("Enter the 6-digit code.");
        if (!(await rateLimit(`checkin:${id}:min`, 10, 60_000))) throw new UserError("Slow down a little and try again.", 429, "RATE_LIMIT");
        result = await B.checkIn(p, id, a.code); break;
      case "complete": result = await B.markCompleted(p, id); break;
      case "no_show": result = await B.markNoShow(p, id); break;
      case "cancel": result = (await B.providerCancel(p, id)).booking; break;
      case "refund": result = await B.resolveAbsentReport(p, id, "refund"); break;
      case "dispute": result = await B.resolveAbsentReport(p, id, "dispute", a.note); break;
      case "retry_refund": result = await B.refundBooking(id, "retry"); break;
    }
    const status = (result as { status?: string })?.status;
    return NextResponse.json({ ok: true, status });
  } catch (e) { return handle(e); }
}
