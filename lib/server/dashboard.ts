import { db } from "./db";
import { sweepExpired } from "./bookings";
import { clientRecord } from "./records";

export async function dashboardData(providerId: string) {
  await sweepExpired(providerId);
  const bookings = await db.booking.findMany({
    where: { providerId, status: { notIn: ["pending_payment"] } },
    include: { service: true, slot: true, refunds: true, reports: true },
    orderBy: [{ updatedAt: "desc" }], take: 60,
  });
  return Promise.all(bookings.map(async (b) => ({
    id: b.id, status: b.status, service: b.service.name, slotStart: b.slot.startsAt.toISOString(),
    depositSats: b.depositSats, depositFiat: b.depositFiat, acceptDeadline: b.acceptDeadline.toISOString(),
    hashTail: b.paymentHash.slice(-6), refund: b.refunds[0] ? { status: b.refunds[0].status, error: b.refunds[0].error } : null,
    report: b.reports.find((r) => r.type === "provider_absent") ? { outcome: b.reports.find((r) => r.type === "provider_absent")!.outcome, deadline: b.reports.find((r) => r.type === "provider_absent")!.deadline?.toISOString() ?? null } : null,
    client: await clientRecord(b.clientIdHash),
  })));
}
