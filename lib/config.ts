/** Rename the app in one place. */
export const APP_NAME = "ShowUpSats";
export const APP_WORDMARK = "showupsats";

export const MIN_DEPOSIT_SATS = 100;
export const MAX_DEPOSIT_SATS = 1_000_000;
export const CURRENCY_ALLOWLIST = ["NGN", "XOF", "XAF", "GHS", "KES", "ZAR", "USD", "EUR", "GBP"] as const;
export type Currency = (typeof CURRENCY_ALLOWLIST)[number];

function num(v: string | undefined, d: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
}
export const ACCEPT_WINDOW_MINUTES = num(process.env.ACCEPT_WINDOW_MINUTES, 10);
export const NO_SHOW_GRACE_MINUTES = num(process.env.NO_SHOW_GRACE_MINUTES, 15);
export const STYLIST_REFUND_DEADLINE_HOURS = num(process.env.STYLIST_REFUND_DEADLINE_HOURS, 24);
export const DEMO_MODE = process.env.DEMO_MODE === "1";
export const NOSTR_RELAYS = (process.env.NOSTR_RELAYS || "wss://relay.damus.io,wss://nos.lol,wss://relay.primal.net")
  .split(",").map((s) => s.trim()).filter(Boolean);
export const NWC_TIMEOUT_MS = 15_000;
export const MAX_HOLDS_PER_CLIENT = 3;
export const MAX_HOLDS_PER_IP = 10;

/** The booking page the site links to as its live example ("See a booking page", "Try the demo", …).
 *  Change it here, or set FEATURED_SLUG on Vercel. Falls back to the seeded demo if that page doesn't exist. */
export const FEATURED_SLUG = process.env.FEATURED_SLUG || "erics-hair-treatment";
export const FALLBACK_SLUG = "demo-braids";
