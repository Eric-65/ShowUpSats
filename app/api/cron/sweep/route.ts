import { NextResponse } from "next/server";
import { sweepExpired } from "@/lib/server/bookings";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cancelled = await sweepExpired();
  return NextResponse.json({ ok: true, cancelled });
}
