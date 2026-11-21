import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { DEMO_MODE } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Setup diagnostics. Shows only variable NAMES and yes/no flags — never values. */
export async function GET() {
  const has = (k: string) => !!process.env[k];
  const dbVars = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "NEON_DATABASE_URL"].filter(has);
  let database: Record<string, unknown>;
  try {
    const providers = await db.provider.count();
    const demo = await db.provider.findUnique({ where: { slug: "demo-braids" }, select: { nwcReceiveEnc: true, nwcRefundEnc: true } });
    database = { ok: true, providers, demoProvider: !!demo, demoWalletA: !!demo?.nwcReceiveEnc, demoWalletB: !!demo?.nwcRefundEnc };
  } catch (e) {
    const code = (e as { code?: string; errorCode?: string })?.code ?? (e as { errorCode?: string })?.errorCode ?? (e as Error)?.name;
    const hint = code === "P2021" ? "Tables are missing: redeploy so the build creates them." :
      code === "P1001" || code === "P1000" ? "Can't reach/log in to the database: check the Neon connection." :
      dbVars.length === 0 ? "No database variable set: connect Neon in Vercel → Storage." : "See Vercel function logs.";
    database = { ok: false, code, hint };
  }
  const env = Object.fromEntries(["ENCRYPTION_KEY", "APP_NOSTR_NSEC", "SEED_NWC_RECEIVE_URI", "SEED_NWC_REFUND_URI", "SEED_DASHBOARD_KEY", "CRON_SECRET", "ALLOW_TEST_FULL_ACCESS_NWC"].map((k) => [k, has(k)]));
  return NextResponse.json({ database, databaseVarsPresent: dbVars, env, demoMode: DEMO_MODE, commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null },
    { headers: { "Cache-Control": "no-store" } });
}
