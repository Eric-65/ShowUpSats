import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { encrypt, newPreimage, policyHash, randomToken, sha256Hex, clientIdHash } from "../lib/server/crypto";
import { defaultPolicy } from "../lib/policy";
import { signAndPublish } from "../lib/server/nostr";

const db = new PrismaClient();
const H = 3600_000;

async function main() {
  // wipe (dev only)
  await db.auditLog.deleteMany(); await db.recordEvent.deleteMany(); await db.report.deleteMany(); await db.refund.deleteMany();
  await db.booking.deleteMany(); await db.slot.deleteMany(); await db.service.deleteMany(); await db.provider.deleteMany();
  await db.rateLimit.deleteMany();

  const policyText = defaultPolicy(24);
  const dashboardKey = process.env.SEED_DASHBOARD_KEY || "demo-braids-dashboard-key-0001";
  const recv = process.env.SEED_NWC_RECEIVE_URI, refund = process.env.SEED_NWC_REFUND_URI;
  const p = await db.provider.create({
    data: {
      displayName: "Demo Braids", slug: "demo-braids", currency: "NGN", language: "en",
      policyText, policyHash: policyHash(policyText), cancelNoticeHours: 24,
      dashboardKeyHash: sha256Hex(dashboardKey),
      nwcReceiveEnc: recv ? encrypt(recv) : null, nwcRefundEnc: refund ? encrypt(refund) : null,
      services: { create: [
        { name: "Knotless braids (medium)", durationMin: 240, priceFiat: 45000, depositFiat: 1500 },
        { name: "Cornrows", durationMin: 90, priceFiat: 15000, depositFiat: 1000 },
        { name: "Wash & retwist", durationMin: 60, priceFiat: 8000, depositFiat: 500 },
      ] },
    },
    include: { services: true },
  });

  // a near-term slot for the live demo (starts in 70 min, so the check-in window is open)
  const soon = new Date(Date.now() + 70 * 60_000); soon.setSeconds(0, 0);
  const soonEnd = new Date(soon.getTime() + H);
  await db.slot.create({ data: { providerId: p.id, startsAt: soon, endsAt: soonEnd, status: "open" } });
  // open slots: next 3 days, 09:00–17:00 every 2h (local server time)
  const today = new Date(); today.setMinutes(0, 0, 0);
  for (let d = 0; d < 3; d++) {
    for (const hour of [9, 11, 13, 15, 17]) {
      const s = new Date(today); s.setDate(s.getDate() + d); s.setHours(hour);
      if (s.getTime() < Date.now() + 30 * 60_000) continue;
      if (s < soonEnd && new Date(s.getTime() + 2 * H) > soon) continue; // no overlap with the demo slot
      await db.slot.create({ data: { providerId: p.id, startsAt: s, endsAt: new Date(s.getTime() + 2 * H), status: "open" } });
    }
  }
  // 6 past bookings in different end states
  const past: { status: string; daysAgo: number; record?: [string, string]; report?: { type: string; filedBy: string; outcome: string } ; refund?: boolean }[] = [
    { status: "completed", daysAgo: 9, record: ["completed", "completed"] },
    { status: "completed", daysAgo: 7, record: ["completed", "completed"] },
    { status: "completed", daysAgo: 4, record: ["completed", "completed"] },
    { status: "refunded", daysAgo: 6, record: ["refunded_cancellation", "provider_cancelled"], refund: true },
    { status: "client_no_show", daysAgo: 3, record: ["client_no_show", "deposit_kept"], report: { type: "client_no_show", filedBy: "provider", outcome: "kept" } },
    { status: "disputed", daysAgo: 2, record: ["disputed", "disputed"], report: { type: "provider_absent", filedBy: "client", outcome: "disputed" } },
  ];
  const clients = ["amina@getalby.com", "kofi@walletofsatoshi.com", "amina@getalby.com", "chidi@blink.sv", "tunde@getalby.com", "fatou@getalby.com"];
  for (const [i, x] of past.entries()) {
    const start = new Date(Date.now() - x.daysAgo * 24 * H); start.setMinutes(0, 0, 0);
    const slot = await db.slot.create({ data: { providerId: p.id, startsAt: start, endsAt: new Date(start.getTime() + 2 * H), status: "booked" } });
    const { preimage, paymentHash } = newPreimage();
    const svc = p.services[i % 3];
    const b = await db.booking.create({ data: {
      providerId: p.id, serviceId: svc.id, slotId: slot.id, clientLnAddress: clients[i], clientIdHash: clientIdHash(clients[i]),
      depositSats: 1200 + i * 100, depositFiat: svc.depositFiat, paymentHash, preimageEnc: encrypt(preimage), invoice: "seeded",
      status: x.status, acceptDeadline: new Date(start.getTime() - 48 * H), acceptedAt: new Date(start.getTime() - 48 * H), clientToken: randomToken(16),
      createdAt: new Date(start.getTime() - 48 * H),
    } });
    if (x.refund) await db.refund.create({ data: { bookingId: b.id, sats: b.depositSats, reason: "provider_cancelled", status: "paid" } });
    if (x.report) await db.report.create({ data: { bookingId: b.id, ...x.report, resolvedAt: start } });
    if (x.record) {
      const at = new Date(start.getTime() + 3 * H);
      const content = { providerSlug: p.slug, bookingId: b.id, type: x.record[0], outcome: x.record[1], at: at.toISOString() };
      const publish = process.env.SEED_PUBLISH === "1";
      let ev;
      if (publish) ev = (await signAndPublish("record", content, [["d", `${b.id}:${x.record[0]}`]])).event;
      else {
        const { finalizeEvent } = await import("nostr-tools/pure");
        const nip19 = await import("nostr-tools/nip19");
        const sk = nip19.decode(process.env.APP_NOSTR_NSEC!).data as Uint8Array;
        ev = finalizeEvent({ kind: 1, created_at: Math.floor(at.getTime() / 1000), tags: [["t", "showupsats"], ["t", "showupsats-record"]], content: JSON.stringify(content) }, sk);
      }
      await db.recordEvent.create({ data: { providerId: p.id, bookingId: b.id, type: x.record[0], outcome: x.record[1], at, eventId: ev.id, eventJson: JSON.stringify(ev) } });
    }
  }
  console.log(`Seeded provider /b/${p.slug}`);
  console.log(`Dashboard login → link name: ${p.slug}  key: ${dashboardKey}`);
  console.log(`Wallet connections: receive=${recv ? "set" : "NOT SET"} refund=${refund ? "set" : "NOT SET"}`);
}
main().finally(() => db.$disconnect());
