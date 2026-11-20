import { z } from "zod";
import { CURRENCY_ALLOWLIST } from "./config";

export const lnAddress = z.string().trim().toLowerCase().max(120)
  .regex(/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, "must look like name@wallet.com");
export const id = z.string().min(5).max(40).regex(/^[a-z0-9]+$/i);
export const slug = z.string().min(3).max(40).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers and dashes");
export const nwcUri = z.string().trim().startsWith("nostr+walletconnect://", "must start with nostr+walletconnect://").max(1000);

export const createBookingSchema = z.object({
  slug, serviceId: id, slotId: id, lnAddress,
  policyHash: z.string().regex(/^[0-9a-f]{64}$/),
  agree: z.literal(true, { message: "You need to agree to the cancellation policy" }),
});
export const onboardingProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  slug,
  currency: z.enum(CURRENCY_ALLOWLIST),
  language: z.enum(["en", "fr"]),
  cancelNoticeHours: z.coerce.number().int().min(0).max(168),
  policyText: z.string().trim().min(20).max(2000),
  services: z.array(z.object({
    name: z.string().trim().min(2).max(60),
    durationMin: z.coerce.number().int().min(10).max(600),
    priceFiat: z.coerce.number().positive().max(1e9),
    depositFiat: z.coerce.number().positive().max(1e9),
  })).min(1).max(10),
});
export const connectionSchema = z.object({ uri: nwcUri });
export const loginSchema = z.object({ slug, key: z.string().trim().min(16).max(64) });
export const actionSchema = z.object({
  action: z.enum(["accept", "decline", "checkin", "complete", "no_show", "cancel", "refund", "dispute", "retry_refund"]),
  code: z.string().regex(/^\d{6}$/).optional(),
  note: z.string().max(280).optional(),
});
export const clientActionSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{32}$/),
  action: z.enum(["cancel", "report_absent"]),
  note: z.string().max(280).optional(),
});
