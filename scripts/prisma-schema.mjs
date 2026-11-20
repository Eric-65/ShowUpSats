// Picks the Prisma provider from DATABASE_URL: postgres:// → postgresql, otherwise sqlite.
// Writes prisma/schema.generated.prisma, used by all prisma commands.
import fs from "node:fs";
const url = process.env.DATABASE_URL || "";
const pg = /^postgres(ql)?:\/\//.test(url);
const src = fs.readFileSync("prisma/schema.prisma", "utf8");
fs.writeFileSync("prisma/schema.generated.prisma", src.replace('provider = "sqlite"', `provider = "${pg ? "postgresql" : "sqlite"}"`));
console.log(`[prisma] provider = ${pg ? "postgresql" : "sqlite"}`);
