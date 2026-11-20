import { db } from "./db";

export async function providerRecord(providerId: string) {
  const [completed, refunded, unresolved, disputed, events] = await Promise.all([
    db.booking.count({ where: { providerId, status: "completed" } }),
    db.booking.count({ where: { providerId, status: "refunded" } }),
    db.report.count({ where: { type: "provider_absent", outcome: "unresolved", booking: { providerId } } }),
    db.booking.count({ where: { providerId, status: "disputed" } }),
    db.recordEvent.findMany({ where: { providerId }, orderBy: { at: "desc" }, take: 30, select: { id: true, type: true, outcome: true, at: true, eventId: true, eventJson: true } }),
  ]);
  return { completed, refunded, unresolved, disputed, events };
}

/** Visible only to providers, keyed by clientIdHash. */
export async function clientRecord(clientIdHash: string) {
  const [past, noShows] = await Promise.all([
    db.booking.count({ where: { clientIdHash, status: { in: ["completed", "checked_in", "client_no_show", "refunded", "client_cancelled", "provider_cancelled", "disputed"] } } }),
    db.booking.count({ where: { clientIdHash, status: "client_no_show" } }),
  ]);
  return { past, noShows };
}
