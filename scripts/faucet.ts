/** Create test wallets on faucet.nwc.dev and wire them into .env (provider) + .env.local.wallets (client). */
import fs from "node:fs";
async function wallet(balance: number) {
  const r = await fetch(`https://faucet.nwc.dev?balance=${balance}`, { method: "POST" });
  const t = (await r.text()).trim();
  if (!r.ok || !t.startsWith("nostr+walletconnect://")) throw new Error(`faucet failed: ${r.status}`);
  return t;
}
(async () => {
  const P = await wallet(10_000), C = await wallet(50_000);
  let env = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : fs.readFileSync(".env.example", "utf8");
  const set = (k: string, v: string) => { env = new RegExp(`^${k}=.*$`, "m").test(env) ? env.replace(new RegExp(`^${k}=.*$`, "m"), `${k}="${v}"`) : env + `\n${k}="${v}"`; };
  set("SEED_NWC_RECEIVE_URI", P); set("SEED_NWC_REFUND_URI", P); set("ALLOW_TEST_FULL_ACCESS_NWC", "1");
  fs.writeFileSync(".env", env);
  fs.writeFileSync(".env.local.wallets", `NWC_PROVIDER_URI="${P}"\nNWC_CLIENT_URI="${C}"\n`);
  const lud16 = (u: string) => new URL(u.replace("nostr+walletconnect://", "http://x/")).searchParams.get("lud16");
  console.log(`Provider wallet P: ${lud16(P)} (10,000 sats) → .env SEED_NWC_*`);
  console.log(`Client wallet C:   ${lud16(C)} (50,000 sats) → .env.local.wallets (paste NWC_CLIENT_URI into Alby / Bitcoin Connect to pay)`);
  console.log("Now run: pnpm seed");
})().catch((e) => { console.error(e.message); process.exit(1); });
