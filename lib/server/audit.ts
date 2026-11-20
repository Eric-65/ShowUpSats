import { db } from "./db";
/** No PII: only IDs and the last 6 chars of payment hashes. */
export async function audit(bookingId: string | null, action: string) {
  try { await db.auditLog.create({ data: { bookingId, action: action.slice(0, 120) } }); } catch { /* never block on audit */ }
}
export const tail6 = (h?: string | null) => (h ? h.slice(-6) : "");
