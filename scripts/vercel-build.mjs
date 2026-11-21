// Vercel build with clear, human-readable errors (secrets are never printed, only variable NAMES).
import { execSync } from "node:child_process";
import { writeSchema, URL_CANDIDATES } from "./prisma-schema.mjs";

const log = (m) => console.log(`\n[showupsats-build] ${m}`);
const fail = (m) => { console.error(`\n[showupsats-build] ✕ BUILD STOPPED: ${m}\n`); process.exit(1); };
const run = (cmd) => execSync(cmd, { stdio: "inherit", env: process.env });
const S = "--schema prisma/schema.generated.prisma";

// 1. environment check
log("1/5 Checking environment variables…");
const missing = [];
const key = process.env.ENCRYPTION_KEY || "";
if (!key) missing.push("ENCRYPTION_KEY");
else if (Buffer.from(key, "base64").length !== 32) fail("ENCRYPTION_KEY must be 32 bytes in base64 (make one with: openssl rand -base64 32).");
if (!(process.env.APP_NOSTR_NSEC || "").startsWith("nsec1")) missing.push("APP_NOSTR_NSEC (must start with nsec1)");
const { urlVar, pg } = writeSchema();
if (!pg) fail(`No Postgres database found. Looked for ${URL_CANDIDATES.join(", ")} and any variable holding a postgres:// URL in the Production environment.\n  Fix: Vercel project → Storage → Create Database → Neon → Connect to this project with Production ticked, then Redeploy without build cache.`);
if (missing.length) fail(`Missing environment variables: ${missing.join(", ")}.\n  Fix: Vercel project → Settings → Environment Variables → add them for Production → Redeploy.`);
log(`✓ env ok (database from ${urlVar})`);

// 2. prisma client
log("2/5 Generating Prisma client…");
run(`prisma generate ${S}`);

// 3. schema push
log("3/5 Creating/updating database tables…");
try { run(`prisma db push --skip-generate --accept-data-loss ${S}`); }
catch { fail(`Could not create tables in the database (env ${urlVar}). Check the database is active in Neon and the URL is correct.`); }

// 4. seed (non-fatal)
log("4/5 Seeding demo data if the database is empty…");
try { run("tsx prisma/seed-if-empty.ts"); } catch { log("⚠ Seeding failed — the app will still deploy. Check SEED_NWC_* variables if you want the demo provider."); }

// 5. next build
log("5/5 Building the Next.js app…");
run("next build");
log("✓ Build finished.");
