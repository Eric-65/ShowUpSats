import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { currentMember } from "@/lib/server/members";
import { handle, UserError } from "@/lib/server/errors";
import { readJson } from "@/lib/server/request";

const schema = z.object({ showInCommunity: z.boolean() });
export async function PATCH(req: Request) {
  try {
    const m = await currentMember();
    if (!m) throw new UserError("Please sign in first.", 401, "UNAUTHORIZED");
    const { showInCommunity } = schema.parse(await readJson(req));
    await db.member.update({ where: { id: m.id }, data: { showInCommunity } });
    return NextResponse.json({ ok: true, showInCommunity });
  } catch (e) { return handle(e); }
}
