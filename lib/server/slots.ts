import { db } from "./db";
/** Default opening hours for new providers: next 7 days, 09:00–17:00 (UTC), 2h slots. */
export async function generateDefaultSlots(providerId: string, days = 7) {
  const base = new Date(); base.setUTCMinutes(0, 0, 0);
  const data: { providerId: string; startsAt: Date; endsAt: Date }[] = [];
  for (let d = 0; d < days; d++) for (const h of [8, 10, 12, 14, 16]) {
    const s = new Date(base); s.setUTCDate(s.getUTCDate() + d); s.setUTCHours(h);
    if (s.getTime() > Date.now() + 60 * 60_000) data.push({ providerId, startsAt: s, endsAt: new Date(s.getTime() + 2 * 3600_000) });
  }
  for (const x of data) await db.slot.create({ data: x }).catch(() => {});
}
