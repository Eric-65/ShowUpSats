import { db } from "./db";
import { decrypt, safeEqualHex, sha256Hex } from "./crypto";
import { UserError } from "./errors";
import { refreshStatus } from "./bookings";

/** What the client (holder of the booking token) may see. Never includes preimage/NWC data. */
export async function clientStatus(id: string, token: string) {
  const raw = await db.booking.findUnique({ where: { id }, select: { clientToken: true } });
  if (!raw || !safeEqualHex(sha256Hex(raw.clientToken), sha256Hex(token))) throw new UserError("This link isn't valid for that booking.", 403, "FORBIDDEN");
  const b = await refreshStatus(id);
  return {
    id: b.id, status: b.status, depositSats: b.depositSats, depositFiat: b.depositFiat, currency: b.provider.currency,
    acceptDeadline: b.acceptDeadline.toISOString(), invoice: b.status === "pending_payment" ? b.invoice : null,
    providerName: b.provider.displayName,
    checkInCode: b.checkInCodeEnc && ["accepted"].includes(b.status) ? decrypt(b.checkInCodeEnc) : null,
  };
}
