/** Production build step: seed the demo provider only if the DB has no providers yet. */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";
(async () => {
  const db = new PrismaClient();
  const n = await db.provider.count().catch(() => -1);
  await db.$disconnect();
  if (n === 0) { console.log("[seed] empty DB → seeding demo data"); execSync("tsx prisma/seed.ts", { stdio: "inherit" }); }
  else console.log(`[seed] skipped (${n} providers)`);
})();
