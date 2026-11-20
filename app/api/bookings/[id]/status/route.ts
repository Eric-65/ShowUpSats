import { NextResponse } from "next/server";
import { handle } from "@/lib/server/errors";
import { clientStatus } from "@/lib/server/clientview";
import { id as idSchema } from "@/lib/validation";
import { z } from "zod";

export const dynamic = "force-dynamic";
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = idSchema.parse((await ctx.params).id);
    const token = z.string().regex(/^[0-9a-f]{32}$/).parse(new URL(req.url).searchParams.get("t"));
    return NextResponse.json(await clientStatus(id, token), { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return handle(e); }
}
