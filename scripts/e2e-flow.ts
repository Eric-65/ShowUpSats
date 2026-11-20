/** Real-wallet e2e of the booking state machine (no UI). pnpm tsx scripts/e2e-flow.ts */
import "dotenv/config";
import { config } from "dotenv"; config({ path: ".env.local.wallets" });
import "../lib/server/ws-polyfill";
import { NWCClient } from "@getalby/sdk/nwc";
import { db } from "../lib/server/db";
import * as B from "../lib/server/bookings";
import { decrypt } from "../lib/server/crypto";
import { verifyEvent } from "nostr-tools/pure";
import { msatsToSats } from "../lib/units";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cli = new NWCClient({ nostrWalletConnectUrl: process.env.NWC_CLIENT_URI! });
const lud16 = new URL(process.env.NWC_CLIENT_URI!.replace("nostr+walletconnect://", "http://x/")).searchParams.get("lud16")!;
const bal = async () => msatsToSats((await cli.getBalance()).balance);

async function book(slotIdx: number) {
  const p = await db.provider.findUniqueOrThrow({ where: { slug: "demo-braids" }, include: { services: true } });
  const slots = await db.slot.findMany({ where: { providerId: p.id, status: "open", startsAt: { gt: new Date() } }, orderBy: { startsAt: "asc" } });
  const b = await B.createBooking({ slug: p.slug, serviceId: p.services[2].id, slotId: slots[slotIdx].id, lnAddress: lud16, policyHash: p.policyHash, ip: "test" });
  console.log(`  booked ${b.id} deposit=${b.depositSats} sats`);
  const pay = cli.payInvoice({ invoice: b.invoice }).catch((e) => ({ err: e.message }));
  for (let i = 0; i < 30; i++) { const s = await B.refreshStatus(b.id); if (s.status === "held") break; await sleep(1000); }
  const s = await db.booking.findUniqueOrThrow({ where: { id: b.id } });
  console.log("  status:", s.status);
  if (s.status !== "held") throw new Error("not held");
  return { b, p, pay };
}

async function main() {
  console.log("client lud16:", lud16);
  let c0 = await bal();
  console.log("1) accept → receipt → check-in → complete");
  const { b, p, pay } = await book(0);
  const acc = await B.acceptBooking(p, b.id);
  console.log("  accepted:", acc.status, "pay:", JSON.stringify(await pay).slice(0, 60));
  const r = await db.booking.findUniqueOrThrow({ where: { id: b.id } });
  const ev = JSON.parse(r.receiptEventJson!);
  console.log("  receipt verified:", verifyEvent(ev), "event", ev.id.slice(0, 10));
  try { await B.checkIn(p, b.id, "000000"); } catch (e) { console.log("  wrong code →", (e as Error).message); }
  // slot may be >2h away → check-in window closed; temporarily move slot for test
  await db.slot.update({ where: { id: r.slotId }, data: { startsAt: new Date(Date.now() + 30 * 60_000) } });
  const ci = await B.checkIn(p, b.id, decrypt(r.checkInCodeEnc!));
  console.log("  check-in:", ci.status);
  console.log("  complete:", (await B.markCompleted(p, b.id)).status);
  let c1 = await bal(); console.log(`  client Δ ${c1 - c0}`);

  console.log("2) timeout → auto-cancel");
  const t = await book(0);
  await db.booking.update({ where: { id: t.b.id }, data: { acceptDeadline: new Date(Date.now() - 1000) } });
  console.log("  swept:", await B.sweepExpired(), "status:", (await db.booking.findUniqueOrThrow({ where: { id: t.b.id } })).status);
  console.log("  pay:", JSON.stringify(await t.pay).slice(0, 60));
  await sleep(1500); const c2 = await bal(); console.log(`  client Δ ${c2 - c1} (expect 0)`);

  console.log("3) accept → provider cancel → refund");
  const x = await book(0);
  await B.acceptBooking(x.p, x.b.id); await x.pay;
  const c3 = await bal();
  const pc = await B.providerCancel(x.p, x.b.id);
  console.log("  cancel:", pc.booking.status, "refund:", pc.refund?.status);
  await sleep(1500); const c4 = await bal(); console.log(`  client Δ after refund ${c4 - c3} (expect +${x.b.depositSats})`);
  const again = await B.refundBooking(x.b.id, "replay"); console.log("  replay refund status:", again?.status, "(no double pay)");
  await sleep(1000); console.log(`  client Δ after replay ${(await bal()) - c4} (expect 0)`);
  console.log("E2E PASSED ✅");
}
main().then(() => { cli.close(); process.exit(0); }, (e) => { console.error("E2E FAILED ❌", e); process.exit(1); });
