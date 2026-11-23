import { NextResponse } from "next/server";
import { clearMemberSession } from "@/lib/server/members";
export async function POST(req: Request) { await clearMemberSession(); return NextResponse.redirect(new URL("/community", req.url), 303); }
