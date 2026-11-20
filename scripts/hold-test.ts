/**
 * M0 gate: prove hold invoices work end-to-end on NWC test wallets.
 * Usage: NWC_PROVIDER_URI=... NWC_CLIENT_URI=... pnpm hold-test
 * (or put them in .env.local.wallets)
 */
import { config } from "dotenv";
config({ path: ".env.local.wallets" });
import "../lib/server/ws-polyfill";
import { NWCClient } from "@getalby/sdk/nwc";
import { newPreimage } from "../lib/server/crypto";
import { satsToMsats, msatsToSats } from "../lib/units";

const P = process.env.NWC_PROVIDER_URI!, C = process.env.NWC_CLIENT_URI!;
if (!P || !C) throw new Error("Set NWC_PROVIDER_URI and NWC_CLIENT_URI");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function balance(c: NWCClient) { return msatsToSats((await c.getBalance()).balance); }

async function holdAndPay(prov: NWCClient, cli: NWCClient, sats: number) {
  const { preimage, paymentHash } = newPreimage();
  const tx = await prov.makeHoldInvoice({ amount: satsToMsats(sats), payment_hash: paymentHash, description: "ShowUpSats M0 hold test", expiry: 600 });
  console.log("  hold invoice created, hash …" + paymentHash.slice(-6));
  // Payment stays pending until settle/cancel — don't await it.
  const payP = cli.payInvoice({ invoice: tx.invoice }).then(
    (r) => ({ ok: true as const, r }), (e) => ({ ok: false as const, e: String(e?.message ?? e) }));
  for (let i = 0; i < 40; i++) {
    const l = await prov.lookupInvoice({ payment_hash: paymentHash });
    if (l.state === "accepted") { console.log("  lookupInvoice state = accepted (HELD) after", i, "polls"); return { preimage, paymentHash, payP }; }
    await sleep(1000);
  }
  throw new Error("Invoice never reached held state");
}

async function main() {
  const prov = new NWCClient({ nostrWalletConnectUrl: P });
  const cli = new NWCClient({ nostrWalletConnectUrl: C });
  try {
    const info = await prov.getInfo();
    console.log("Provider methods:", info.methods.join(","));
    const p0 = await balance(prov), c0 = await balance(cli);
    console.log(`Start  P=${p0} C=${c0}`);

    console.log("Case 1: hold → settle");
    const a = await holdAndPay(prov, cli, 100);
    await prov.settleHoldInvoice({ preimage: a.preimage });
    console.log("  pay result:", JSON.stringify(await a.payP).slice(0, 120));
    await sleep(1500);
    const p1 = await balance(prov), c1 = await balance(cli);
    console.log(`  After settle P=${p1} (Δ${p1 - p0}) C=${c1} (Δ${c1 - c0})`);
    if (p1 - p0 < 100) throw new Error("Provider did not receive sats");

    console.log("Case 2: hold → cancel");
    const b = await holdAndPay(prov, cli, 100);
    await prov.cancelHoldInvoice({ payment_hash: b.paymentHash });
    console.log("  pay result:", JSON.stringify(await b.payP).slice(0, 120));
    await sleep(1500);
    const p2 = await balance(prov), c2 = await balance(cli);
    console.log(`  After cancel P=${p2} (Δ${p2 - p1}) C=${c2} (Δ${c2 - c1})`);
    if (c2 !== c1) throw new Error("Client was charged on cancel!");
    // idempotency probe
    try { await prov.cancelHoldInvoice({ payment_hash: b.paymentHash }); console.log("  re-cancel: ok"); }
    catch (e) { console.log("  re-cancel error (expected, treated as ok):", (e as {code?:string}).code, (e as Error).message); }
    console.log("M0 PASSED ✅");
  } finally { prov.close(); cli.close(); }
}
main().then(() => process.exit(0), (e) => { console.error("M0 FAILED ❌", e); process.exit(1); });
