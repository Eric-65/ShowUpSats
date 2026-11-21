// Writes prisma/schema.generated.prisma (used by every prisma command).
// - Finds the database URL under any name Vercel/Neon may use (DATABASE_URL, POSTGRES_PRISMA_URL, …).
// - postgres:// → provider "postgresql" (+ directUrl for migrations when an unpooled URL exists); otherwise sqlite.
import fs from "node:fs";

export const URL_CANDIDATES = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "NEON_DATABASE_URL"];
const DIRECT_CANDIDATES = ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "POSTGRES_URL_NO_SSL"];
const isPg = (v) => /^postgres(ql)?:\/\//.test(v || "");

export function resolveDb(env = process.env) {
  let urlVar = URL_CANDIDATES.find((k) => isPg(env[k]));
  // Neon/Vercel "custom prefix" installs (e.g. STORAGE_URL, MYDB_PRISMA_URL): scan every variable for a postgres URL
  const anyPg = Object.keys(env).filter((k) => isPg(env[k])).sort();
  if (!urlVar) urlVar = anyPg.find((k) => /PRISMA/.test(k)) || anyPg.find((k) => !/UNPOOLED|NON_POOLING|NO_SSL/.test(k)) || anyPg[0];
  if (!urlVar) urlVar = URL_CANDIDATES.find((k) => env[k]) || "DATABASE_URL";
  const pg = isPg(env[urlVar]);
  const directVar = pg ? [...DIRECT_CANDIDATES, ...anyPg.filter((k) => /UNPOOLED|NON_POOLING/.test(k))].find((k) => isPg(env[k]) && k !== urlVar) : undefined;
  return { urlVar, pg, directVar };
}

export function writeSchema(env = process.env) {
  const { urlVar, pg, directVar } = resolveDb(env);
  const src = fs.readFileSync("prisma/schema.prisma", "utf8");
  const out = src
    .replace('provider = "sqlite"', `provider = "${pg ? "postgresql" : "sqlite"}"`)
    .replace('url      = env("DATABASE_URL")', `url      = env("${urlVar}")${directVar ? `\n  directUrl = env("${directVar}")` : ""}`);
  fs.writeFileSync("prisma/schema.generated.prisma", out);
  console.log(`[prisma] provider=${pg ? "postgresql" : "sqlite"} url=env(${urlVar})${directVar ? ` directUrl=env(${directVar})` : ""}`);
  return { urlVar, pg, directVar };
}

if (import.meta.url === `file://${process.argv[1]}`) writeSchema();
