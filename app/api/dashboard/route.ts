import { NextResponse } from "next/server";
import { handle } from "@/lib/server/errors";
import { requireProvider } from "@/lib/server/auth";
import { dashboardData } from "@/lib/server/dashboard";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const p = await requireProvider();
    return NextResponse.json({ bookings: await dashboardData(p.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return handle(e); }
}
