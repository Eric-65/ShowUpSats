import type { Booking, Provider } from "@prisma/client";
import { db } from "./db";
import { audit, tail6 } from "./audit";
import { clientIdHash, codeHash, decrypt, encrypt, newPreimage, randomToken, sixDigitCode, sha256Hex, safeEqualHex } from "./crypto";
import { UserError } from "./errors";
import { fiatToSats } from "./fx";
import { checkLnAddress, invoiceForAddress } from "./lnaddress";
import { isIdempotentOk, nwcErrorCode } from "./nwc";
import { receiveWallet, refundWallet } from "./wallet";
import { signAndPublish } from "./nostr";
import {
  ACCEPT_WINDOW_MINUTES, APP_NAME, MAX_HOLDS_PER_CLIENT, MAX_HOLDS_PER_IP, NO_SHOW_GRACE_MINUTES, STYLIST_REFUND_DEADLINE_HOURS,
} from "../config";

const MIN = 60_000;
const HOLDING = ["pending_payment", "held"];

const recv = (p: Provider) => receiveWallet(p.nwcReceiveEnc ? decrypt(p.nwcReceiveEnc) : null);
const refundW = (p: Provider) => refundWallet(p.nwcRefundEnc ? decrypt(p.nwcRefundEnc) : null);

// ---------------------------------------------------------------- create
export async function createBooking(input: {
  slug: string; serviceId: string; slotId: string; lnAddress: string; policyHash: string; ip: string;
}) {
  const provider = await db.provider.findUnique({ where: { slug: input.slug } });
  if (!provider) throw new UserError("This booking link doesn't exist.", 404, "NOT_FOUND");
  if (!provider.nwcReceiveEnc) throw new UserError(`${provider.displayName} hasn't connected a wallet yet, so bookings are closed.`, 409, "NO_WALLET");
  if (input.policyHash !== provider.policyHash) throw new UserError("The cancellation policy changed. Please reload the page and agree to the new policy.", 409, "POLICY_CHANGED");
  const service = await db.service.findFirst({ where: { id: input.serviceId, providerId: provider.id } });
  if (!service) throw new UserError("That service isn't available any more.", 404, "NOT_FOUND");

  await sweepExpired(provider.id);

  const cid = clientIdHash(input.lnAddress);
  const ipHash = sha256Hex(`ip:${input.ip}:${process.env.ENCRYPTION_KEY}`);
  const [clientHolds, ipHolds] = await Promise.all([
    db.booking.count({ where: { clientIdHash: cid, status: { in: HOLDING } } }),
    db.booking.count({ where: { clientIpHash: ipHash, status: { in: HOLDING } } }),
  ]);
  if (clientHolds >= MAX_HOLDS_PER_CLIENT) throw new UserError("You already have 3 bookings waiting. Finish or cancel one first.", 429, "TOO_MANY_HOLDS");
  if (ipHolds >= MAX_HOLDS_PER_IP) throw new UserError("Too many pending bookings from this network. Try again in 10 minutes.", 429, "TOO_MANY_HOLDS");

  const depositSats = await fiatToSats(service.depositFiat, provider.currency);
  try { await checkLnAddress(input.lnAddress, depositSats); }
  catch { throw new UserError("We couldn't reach that Lightning address. Check it is correct — we need it to send refunds.", 400, "BAD_LN_ADDRESS"); }

  const { preimage, paymentHash } = newPreimage();
  const deadline = new Date(Date.now() + ACCEPT_WINDOW_MINUTES * MIN);

  // Lock the slot atomically: only one booking can flip open → held.
  const booking = await db.$transaction(async (tx) => {
    const slot = await tx.slot.findFirst({ where: { id: input.slotId, providerId: provider.id } });
    if (!slot || slot.startsAt.getTime() < Date.now()) throw new UserError("That time is no longer available. Please pick another.", 409, "SLOT_TAKEN");
    // overlap check: any other non-open slot of this provider overlapping this one?
    const overlap = await tx.slot.count({ where: { providerId: provider.id, id: { not: slot.id }, status: { not: "open" }, startsAt: { lt: slot.endsAt }, endsAt: { gt: slot.startsAt } } });
    if (overlap > 0) throw new UserError("That time overlaps another booking. Please pick another.", 409, "SLOT_TAKEN");
    const res = await tx.slot.updateMany({ where: { id: slot.id, status: "open" }, data: { status: "held" } });
    if (res.count !== 1) throw new UserError("Someone just took that time. Please pick another.", 409, "SLOT_TAKEN");
    return tx.booking.create({
      data: {
        providerId: provider.id, serviceId: service.id, slotId: slot.id,
        clientLnAddress: input.lnAddress.trim().toLowerCase(), clientIdHash: cid, clientIpHash: ipHash,
        depositSats, depositFiat: service.depositFiat, paymentHash, preimageEnc: encrypt(preimage), invoice: "",
        status: "pending_payment", acceptDeadline: deadline, clientToken: randomToken(16),
      },
    });
  });

  try {
    const invoice = await recv(provider).makeHold(depositSats, paymentHash, `${APP_NAME} deposit · ${service.name}`, ACCEPT_WINDOW_MINUTES * 60 * 2);
    await db.booking.update({ where: { id: booking.id }, data: { invoice } });
    await audit(booking.id, `created hold …${tail6(paymentHash)}`);
    return { ...booking, invoice };
  } catch (e) {
    await db.$transaction([
      db.booking.update({ where: { id: booking.id }, data: { status: "expired" } }),
      db.slot.update({ where: { id: booking.slotId }, data: { status: "open" } }),
    ]);
    await audit(booking.id, `make_hold failed ${nwcErrorCode(e)}`.slice(0, 80));
    throw new UserError(`We couldn't reach ${provider.displayName}'s wallet. No money was taken. Please try again in a minute.`, 502, "WALLET_UNREACHABLE");
  }
}

// ---------------------------------------------------------------- status / sweep
export async function refreshStatus(bookingId: string) {
  let b = await db.booking.findUnique({ where: { id: bookingId }, include: { provider: true } });
  if (!b) throw new UserError("Booking not found.", 404, "NOT_FOUND");
  if (b.status === "pending_payment" && b.invoice) {
    try {
      const state = await recv(b.provider).lookup(b.paymentHash);
      if (state === "accepted") {
        // payment is locked in the client's channel → start the provider's accept window now
        const r = await db.booking.updateMany({ where: { id: b.id, status: "pending_payment" }, data: { status: "held", acceptDeadline: new Date(Date.now() + ACCEPT_WINDOW_MINUTES * MIN) } });
        if (r.count) await audit(b.id, `payment held …${tail6(b.paymentHash)}`);
      }
    } catch { /* transient; next poll retries */ }
  }
  await sweepExpired(b.providerId);
  b = await db.booking.findUnique({ where: { id: bookingId }, include: { provider: true } });
  return b!;
}

/** Cancel every hold past its deadline. Idempotent: NOT_FOUND / already cancelled = success. */
export async function sweepExpired(providerId?: string) {
  const due = await db.booking.findMany({
    where: { status: { in: HOLDING }, acceptDeadline: { lt: new Date() }, ...(providerId ? { providerId } : {}) },
    include: { provider: true }, take: 25,
  });
  let cancelled = 0;
  for (const b of due) {
    // claim it first so concurrent sweeps/accepts don't race
    const claim = await db.booking.updateMany({ where: { id: b.id, status: b.status }, data: { status: "expiring" } });
    if (!claim.count) continue;
    try {
      if (b.invoice) await recv(b.provider).cancel(b.paymentHash);
    } catch (e) {
      if (!isIdempotentOk(e)) { await db.booking.update({ where: { id: b.id }, data: { status: b.status } }); continue; }
    }
    await db.$transaction([
      db.booking.update({ where: { id: b.id }, data: { status: "expired" } }),
      db.slot.update({ where: { id: b.slotId }, data: { status: "open" } }),
    ]);
    await audit(b.id, `expired+cancelled …${tail6(b.paymentHash)}`);
    cancelled++;
  }
  await sweepReports(providerId);
  return cancelled;
}

/** provider_absent reports past their refund deadline become unresolved no-shows on the provider's record. */
async function sweepReports(providerId?: string) {
  const due = await db.report.findMany({
    where: { type: "provider_absent", outcome: null, deadline: { lt: new Date() }, ...(providerId ? { booking: { providerId } } : {}) },
    include: { booking: { include: { provider: true } } }, take: 25,
  });
  for (const r of due) {
    const upd = await db.report.updateMany({ where: { id: r.id, outcome: null }, data: { outcome: "unresolved", resolvedAt: new Date() } });
    if (upd.count) await publishRecord(r.booking, "provider_absent", "unresolved");
  }
}

// ---------------------------------------------------------------- provider actions
async function ownBooking(provider: Provider, bookingId: string) {
  const b = await db.booking.findFirst({ where: { id: bookingId, providerId: provider.id }, include: { service: true, slot: true, provider: true } });
  if (!b) throw new UserError("Booking not found.", 404, "NOT_FOUND");
  return b;
}

export async function acceptBooking(provider: Provider, bookingId: string) {
  await refreshStatus(bookingId).catch(() => null);
  const b = await ownBooking(provider, bookingId);
  if (b.status === "accepted") return b; // idempotent replay
  if (b.status !== "held") throw new UserError(b.status === "expired" ? "Too late — this hold expired and the client kept their sats." : "This booking can't be accepted right now.", 409, "BAD_STATE");
  if (b.acceptDeadline < new Date()) throw new UserError("Too late — the accept window has closed.", 409, "EXPIRED");
  const claim = await db.booking.updateMany({ where: { id: b.id, status: "held" }, data: { status: "settling" } });
  if (!claim.count) throw new UserError("This booking is already being processed.", 409, "BUSY");
  try {
    await recv(provider).settle(decrypt(b.preimageEnc));
  } catch (e) {
    // maybe it already settled (replay after timeout)?
    let state = "unknown";
    try { state = await recv(provider).lookup(b.paymentHash); } catch {}
    if (state !== "settled") {
      await db.booking.update({ where: { id: b.id }, data: { status: "held" } });
      await audit(b.id, `settle failed ${nwcErrorCode(e)}`.slice(0, 80));
      throw new UserError("Your wallet didn't respond. Nothing was charged yet — tap Accept again.", 502, "WALLET_UNREACHABLE");
    }
  }
  const code = sixDigitCode();
  const acceptedAt = new Date();
  await db.$transaction([
    db.booking.update({
      where: { id: b.id },
      data: {
        status: "accepted", acceptedAt,
        checkInCodeHash: codeHash(b.id, code), checkInCodeEnc: encrypt(code),
        checkInCodeExpiresAt: new Date(b.slot.startsAt.getTime() + 2 * 60 * MIN),
      },
    }),
    db.slot.update({ where: { id: b.slotId }, data: { status: "booked" } }),
  ]);
  await audit(b.id, `settled …${tail6(b.paymentHash)}`);
  await issueReceipt(b.id).catch((e) => console.error("[receipt] failed", (e as Error).message));
  return db.booking.findUniqueOrThrow({ where: { id: b.id } });
}

export async function declineBooking(provider: Provider, bookingId: string) {
  const b = await ownBooking(provider, bookingId);
  if (b.status === "declined") return b;
  if (!HOLDING.includes(b.status)) throw new UserError("This booking can't be declined now.", 409, "BAD_STATE");
  const claim = await db.booking.updateMany({ where: { id: b.id, status: b.status }, data: { status: "declining" } });
  if (!claim.count) throw new UserError("This booking is already being processed.", 409, "BUSY");
  try { await recv(provider).cancel(b.paymentHash); }
  catch (e) {
    if (!isIdempotentOk(e)) {
      await db.booking.update({ where: { id: b.id }, data: { status: b.status } });
      throw new UserError("Your wallet didn't respond. Tap Decline again (the hold also auto-cancels at the deadline).", 502, "WALLET_UNREACHABLE");
    }
  }
  await db.$transaction([
    db.booking.update({ where: { id: b.id }, data: { status: "declined" } }),
    db.slot.update({ where: { id: b.slotId }, data: { status: "open" } }),
  ]);
  await audit(b.id, `declined+cancelled …${tail6(b.paymentHash)}`);
  return db.booking.findUniqueOrThrow({ where: { id: b.id } });
}

export async function checkIn(provider: Provider, bookingId: string, code: string) {
  const b = await ownBooking(provider, bookingId);
  if (b.status === "checked_in") return b;
  if (b.status !== "accepted") throw new UserError("Only accepted bookings can be checked in.", 409, "BAD_STATE");
  const now = new Date();
  if (b.checkInLockedUntil && b.checkInLockedUntil > now) throw new UserError("Too many wrong codes. Try again in 10 minutes.", 429, "LOCKED");
  const opens = b.slot.startsAt.getTime() - 2 * 60 * MIN;
  if (now.getTime() < opens) throw new UserError("Check-in opens 2 hours before the appointment.", 409, "TOO_EARLY");
  if (!b.checkInCodeExpiresAt || now > b.checkInCodeExpiresAt) throw new UserError("This check-in code has expired.", 409, "CODE_EXPIRED");
  const ok = b.checkInCodeHash && safeEqualHex(b.checkInCodeHash, codeHash(b.id, code));
  if (!ok) {
    const attempts = b.checkInAttempts + 1;
    await db.booking.update({ where: { id: b.id }, data: attempts >= 5 ? { checkInAttempts: 0, checkInLockedUntil: new Date(now.getTime() + 10 * MIN) } : { checkInAttempts: attempts } });
    throw new UserError(attempts >= 5 ? "Wrong code 5 times. Check-in is locked for 10 minutes." : `Wrong code. ${5 - attempts} tries left.`, 400, "BAD_CODE");
  }
  await db.booking.update({ where: { id: b.id }, data: { status: "checked_in", checkInAttempts: 0 } });
  await audit(b.id, "checked_in");
  return db.booking.findUniqueOrThrow({ where: { id: b.id } });
}

export async function markCompleted(provider: Provider, bookingId: string) {
  const b = await ownBooking(provider, bookingId);
  if (b.status === "completed") return b;
  if (b.status !== "checked_in") throw new UserError("You can mark a booking completed only after the client checks in.", 409, "BAD_STATE");
  await db.booking.update({ where: { id: b.id }, data: { status: "completed" } });
  await publishRecord(b, "completed", "completed");
  return db.booking.findUniqueOrThrow({ where: { id: b.id } });
}

export async function markNoShow(provider: Provider, bookingId: string) {
  const b = await ownBooking(provider, bookingId);
  if (b.status === "client_no_show" || b.status === "disputed") return b;
  const graceOver = Date.now() > b.slot.startsAt.getTime() + NO_SHOW_GRACE_MINUTES * MIN;
  if (!graceOver) throw new UserError(`You can mark a no-show ${NO_SHOW_GRACE_MINUTES} minutes after the start time.`, 409, "TOO_EARLY");
  if (b.status === "stylist_absent_reported") {
    // both sides report each other → disputed, no automatic judgement
    await db.$transaction([
      db.booking.update({ where: { id: b.id }, data: { status: "disputed" } }),
      db.report.upsert({ where: { bookingId_type: { bookingId: b.id, type: "client_no_show" } }, create: { bookingId: b.id, type: "client_no_show", filedBy: "provider", outcome: "disputed", resolvedAt: new Date() }, update: {} }),
      db.report.updateMany({ where: { bookingId: b.id, type: "provider_absent", outcome: null }, data: { outcome: "disputed", resolvedAt: new Date() } }),
    ]);
    await publishRecord(b, "disputed", "disputed");
    return db.booking.findUniqueOrThrow({ where: { id: b.id } });
  }
  if (b.status !== "accepted") throw new UserError("Only accepted bookings without a check-in can be marked no-show.", 409, "BAD_STATE");
  await db.$transaction([
    db.booking.update({ where: { id: b.id }, data: { status: "client_no_show" } }),
    db.report.create({ data: { bookingId: b.id, type: "client_no_show", filedBy: "provider", outcome: "kept", resolvedAt: new Date() } }),
  ]);
  await publishRecord(b, "client_no_show", "deposit_kept");
  return db.booking.findUniqueOrThrow({ where: { id: b.id } });
}

export async function providerCancel(provider: Provider, bookingId: string) {
  const b = await ownBooking(provider, bookingId);
  if (b.status === "provider_cancelled" || b.status === "refunded") return { booking: b, refund: await db.refund.findUnique({ where: { bookingId: b.id } }) };
  if (HOLDING.includes(b.status)) return { booking: await declineBooking(provider, bookingId), refund: null };
  if (b.status !== "accepted") throw new UserError("You can cancel only before the client checks in.", 409, "BAD_STATE");
  await db.$transaction([
    db.booking.update({ where: { id: b.id }, data: { status: "provider_cancelled" } }),
    db.slot.update({ where: { id: b.slotId }, data: { status: "open" } }),
  ]);
  const refund = await refundBooking(b.id, "provider_cancelled");
  return { booking: await db.booking.findUniqueOrThrow({ where: { id: b.id } }), refund };
}

/** Provider responds to a provider_absent report. */
export async function resolveAbsentReport(provider: Provider, bookingId: string, action: "refund" | "dispute", note?: string) {
  const b = await ownBooking(provider, bookingId);
  const r = await db.report.findUnique({ where: { bookingId_type: { bookingId: b.id, type: "provider_absent" } } });
  if (!r) throw new UserError("There's no report on this booking.", 404, "NOT_FOUND");
  if (r.outcome && r.outcome !== "refund_failed") return b;
  if (r.deadline && r.deadline < new Date()) throw new UserError("The response deadline has passed.", 409, "EXPIRED");
  if (action === "dispute") {
    await db.$transaction([
      db.report.update({ where: { id: r.id }, data: { outcome: "disputed", note: note?.slice(0, 280), resolvedAt: new Date() } }),
      db.booking.update({ where: { id: b.id }, data: { status: "disputed" } }),
    ]);
    await publishRecord(b, "disputed", "disputed");
  } else {
    const refund = await refundBooking(b.id, "provider_absent");
    if (refund?.status === "paid") await db.report.update({ where: { id: r.id }, data: { outcome: "refunded", resolvedAt: new Date() } });
  }
  return db.booking.findUniqueOrThrow({ where: { id: b.id } });
}

// ---------------------------------------------------------------- client actions (authorised by clientToken)
async function clientBooking(bookingId: string, token: string) {
  const b = await db.booking.findUnique({ where: { id: bookingId }, include: { slot: true, provider: true, service: true } });
  if (!b || !safeEqualHex(sha256Hex(b.clientToken), sha256Hex(token))) throw new UserError("This link isn't valid for that booking.", 403, "FORBIDDEN");
  return b;
}

export async function clientCancel(bookingId: string, token: string) {
  const b = await clientBooking(bookingId, token);
  if (b.status === "client_cancelled" || b.status === "refunded") return { refunded: b.status === "refunded" };
  if (HOLDING.includes(b.status)) { await declineBooking(b.provider, b.id); return { refunded: false, released: true }; }
  if (b.status !== "accepted") throw new UserError("This booking can't be cancelled now.", 409, "BAD_STATE");
  const early = Date.now() <= b.slot.startsAt.getTime() - b.provider.cancelNoticeHours * 60 * MIN;
  await db.$transaction([
    db.booking.update({ where: { id: b.id }, data: { status: "client_cancelled" } }),
    db.slot.update({ where: { id: b.slotId }, data: { status: "open" } }),
  ]);
  await audit(b.id, `client_cancelled early=${early}`);
  if (!early) return { refunded: false, kept: true };
  const refund = await refundBooking(b.id, "client_cancelled_in_time");
  return { refunded: refund?.status === "paid", refund };
}

export async function reportProviderAbsent(bookingId: string, token: string, note?: string) {
  const b = await clientBooking(bookingId, token);
  const graceOver = Date.now() > b.slot.startsAt.getTime() + NO_SHOW_GRACE_MINUTES * MIN;
  if (!graceOver) throw new UserError(`You can report this ${NO_SHOW_GRACE_MINUTES} minutes after the start time.`, 409, "TOO_EARLY");
  if (b.status === "client_no_show") {
    await db.$transaction([
      db.booking.update({ where: { id: b.id }, data: { status: "disputed" } }),
      db.report.create({ data: { bookingId: b.id, type: "provider_absent", filedBy: "client", note: note?.slice(0, 280), outcome: "disputed", resolvedAt: new Date() } }),
      db.report.updateMany({ where: { bookingId: b.id, type: "client_no_show" }, data: { outcome: "disputed" } }),
    ]);
    await publishRecord(b, "disputed", "disputed");
    return;
  }
  if (b.status === "stylist_absent_reported") return;
  if (b.status !== "accepted") throw new UserError("You can only report a booking that was accepted and not checked in.", 409, "BAD_STATE");
  await db.$transaction([
    db.booking.update({ where: { id: b.id }, data: { status: "stylist_absent_reported" } }),
    db.report.create({ data: { bookingId: b.id, type: "provider_absent", filedBy: "client", note: note?.slice(0, 280), deadline: new Date(Date.now() + STYLIST_REFUND_DEADLINE_HOURS * 60 * MIN) } }),
  ]);
  await audit(b.id, "provider_absent reported");
}

// ---------------------------------------------------------------- refunds (connection B)
export async function refundBooking(bookingId: string, reason: string) {
  const b = await db.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { provider: true } });
  // at most one refund per booking (unique bookingId)
  let r = await db.refund.findUnique({ where: { bookingId } });
  if (r?.status === "paid" || r?.status === "paying") return r;
  if (!r) {
    try { r = await db.refund.create({ data: { bookingId, sats: b.depositSats, reason, status: "pending" } }); }
    catch { return db.refund.findUnique({ where: { bookingId } }); } // concurrent creator won
  }
  const claim = await db.refund.updateMany({ where: { id: r.id, status: { in: ["pending", "failed"] } }, data: { status: "paying", attempts: { increment: 1 } } });
  if (!claim.count) return db.refund.findUnique({ where: { id: r.id } });
  try {
    // Reuse the same invoice on retry: a bolt11 can only be paid once → replays can't double-pay.
    let invoice = (await db.refund.findUnique({ where: { id: r.id } }))?.invoice ?? null;
    if (!invoice) {
      const inv = await invoiceForAddress(b.clientLnAddress, b.depositSats, `${APP_NAME} refund`);
      invoice = inv.invoice;
      await db.refund.update({ where: { id: r.id }, data: { paymentHash: inv.paymentHash, invoice } });
    }
    await refundW(b.provider).pay(invoice);
    const paid = await db.refund.update({ where: { id: r.id }, data: { status: "paid", error: null } });
    await db.booking.update({ where: { id: bookingId }, data: { status: "refunded" } });
    await audit(bookingId, `refund paid …${tail6(paid.paymentHash)}`);
    await publishRecord(b, "refunded_cancellation", reason);
    return paid;
  } catch (e) {
    const code = nwcErrorCode(e);
    const quota = /QUOTA_EXCEEDED|budget|quota/i.test(code + String((e as Error)?.message));
    const alreadyPaid = /already paid|ALREADY/i.test(code + String((e as Error)?.message));
    if (alreadyPaid) {
      const paid = await db.refund.update({ where: { id: r.id }, data: { status: "paid", error: null } });
      await db.booking.update({ where: { id: bookingId }, data: { status: "refunded" } });
      return paid;
    }
    await db.refund.update({ where: { id: r.id }, data: { status: "failed", error: quota ? "QUOTA_EXCEEDED" : code.slice(0, 60) } });
    await audit(bookingId, `refund failed ${quota ? "QUOTA_EXCEEDED" : "error"}`);
    if (quota) throw new UserError("Your refund budget is used up. Raise it in your wallet, then tap Retry refund.", 402, "QUOTA_EXCEEDED");
    throw new UserError("The refund didn't go through yet. Tap Retry refund in a minute.", 502, "REFUND_FAILED");
  }
}

// ---------------------------------------------------------------- receipts + records (Nostr)
export async function issueReceipt(bookingId: string) {
  const b = await db.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { provider: true, service: true, slot: true } });
  if (b.receiptEventId) return b;
  const content = {
    bookingId: b.id, providerSlug: b.provider.slug, serviceName: b.service.name, slotStart: b.slot.startsAt.toISOString(),
    depositSats: b.depositSats, depositFiat: b.depositFiat, currency: b.provider.currency, paymentHash: b.paymentHash,
    policyHash: b.provider.policyHash, acceptedAt: (b.acceptedAt ?? new Date()).toISOString(),
  };
  const { event } = await signAndPublish("receipt", content, [["d", b.id]]);
  return db.booking.update({ where: { id: b.id }, data: { receiptEventId: event.id, receiptEventJson: JSON.stringify(event) } });
}

export async function publishRecord(b: Pick<Booking, "id" | "providerId">, type: string, outcome: string) {
  const provider = await db.provider.findUniqueOrThrow({ where: { id: b.providerId } });
  const existing = await db.recordEvent.findUnique({ where: { bookingId_type: { bookingId: b.id, type } } });
  if (existing) return existing;
  const at = new Date();
  let eventId: string | null = null, eventJson: string | null = null;
  try {
    const { event } = await signAndPublish("record", { providerSlug: provider.slug, bookingId: b.id, type, outcome, at: at.toISOString() }, [["d", `${b.id}:${type}`]]);
    eventId = event.id; eventJson = JSON.stringify(event);
  } catch (e) { console.error("[record] sign failed", (e as Error).message); }
  return db.recordEvent.create({ data: { providerId: provider.id, bookingId: b.id, type, outcome, at, eventId, eventJson } }).catch(() => null);
}
