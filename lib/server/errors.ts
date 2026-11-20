import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class UserError extends Error {
  constructor(public userMessage: string, public status = 400, public code = "BAD_REQUEST") { super(userMessage); }
}
export function handle(e: unknown) {
  if (e instanceof UserError) return NextResponse.json({ error: e.userMessage, code: e.code }, { status: e.status });
  if (e instanceof ZodError) return NextResponse.json({ error: "Some details look wrong: " + e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), code: "VALIDATION" }, { status: 400 });
  console.error("[api] unexpected error:", (e as Error)?.name, (e as Error)?.message?.slice(0, 200));
  return NextResponse.json({ error: "Something went wrong on our side. Please try again in a moment.", code: "INTERNAL" }, { status: 500 });
}
