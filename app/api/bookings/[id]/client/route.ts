import { NextResponse } from "next/server";
import { handle, UserError } from "@/lib/server/errors";
import { clientActionSchema, id as idSchema } from "@/lib/validation";
import { clientCancel, reportProviderAbsent } from "@/lib/server/bookings";
import { rateLimit } from "@/lib/server/ratelimit";
import { readJson } from "@/lib/server/request";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = idSchema.parse((await ctx.params).id);
    const a = clientActionSchema.parse(await readJson(req));
    if (!(await rateLimit(`client:${id}`, 10, 60 * 60_000))) throw new UserError("Too many requests for this booking. Try again later.", 429, "RATE_LIMIT");
    if (a.action === "cancel") return NextResponse.json({ ok: true, ...(await clientCancel(id, a.token)), refund: undefined });
    await reportProviderAbsent(id, a.token, a.note);
    return NextResponse.json({ ok: true });
  } catch (e) { return handle(e); }
}
