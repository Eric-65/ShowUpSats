import { NextResponse } from "next/server";
import { handle, UserError } from "@/lib/server/errors";
import { createBookingSchema } from "@/lib/validation";
import { createBooking } from "@/lib/server/bookings";
import { rateLimit } from "@/lib/server/ratelimit";
import { clientIp, readJson } from "@/lib/server/request";

export async function POST(req: Request) {
  try {
    const ip = await clientIp();
    if (!(await rateLimit(`book:${ip}`, 20, 10 * 60_000))) throw new UserError("Too many booking attempts. Wait 10 minutes and try again.", 429, "RATE_LIMIT");
    const d = createBookingSchema.parse(await readJson(req));
    const b = await createBooking({ ...d, ip });
    return NextResponse.json({
      id: b.id, token: b.clientToken, invoice: b.invoice, depositSats: b.depositSats, depositFiat: b.depositFiat,
      acceptDeadline: b.acceptDeadline.toISOString(), paymentHash: b.paymentHash,
    });
  } catch (e) { return handle(e); }
}
