import { getFiatBtcRate } from "@getalby/lightning-tools/fiat";
import { db } from "./db";
import { CURRENCY_ALLOWLIST, MAX_DEPOSIT_SATS, MIN_DEPOSIT_SATS } from "../config";

/** Loose sanity bounds on BTC price per currency unit (fiat per BTC). Rejects garbage/FX manipulation. */
const BTC_PRICE_BOUNDS: Record<string, [number, number]> = {
  USD: [10_000, 1_000_000], EUR: [10_000, 1_000_000], GBP: [8_000, 900_000],
  NGN: [10_000_000, 2_000_000_000], XOF: [5_000_000, 700_000_000], XAF: [5_000_000, 700_000_000],
  GHS: [100_000, 20_000_000], KES: [1_000_000, 150_000_000], ZAR: [150_000, 20_000_000],
};
const TTL_MS = 5 * 60 * 1000;

export class FxError extends Error {}

/** fiat units per BTC, cached 5 min in DB, sanity-checked. */
export async function btcPrice(currency: string): Promise<number> {
  if (!(CURRENCY_ALLOWLIST as readonly string[]).includes(currency)) throw new FxError("Currency not supported");
  const cached = await db.fxCache.findUnique({ where: { currency } });
  if (cached && Date.now() - cached.fetchedAt.getTime() < TTL_MS) return cached.btcPrice;
  let price: number;
  try {
    price = (await getFiatBtcRate(currency)) * 100_000_000; // lib returns fiat per sat → fiat per BTC
  } catch {
    if (cached && Date.now() - cached.fetchedAt.getTime() < 60 * 60 * 1000) return cached.btcPrice; // stale ≤1h fallback
    throw new FxError("Exchange rate unavailable. Try again in a minute.");
  }
  const [lo, hi] = BTC_PRICE_BOUNDS[currency] ?? [0, Infinity];
  if (!Number.isFinite(price) || price < lo || price > hi) throw new FxError("Exchange rate looks wrong; booking paused for safety.");
  if (cached && Math.abs(price - cached.btcPrice) / cached.btcPrice > 0.2 && Date.now() - cached.fetchedAt.getTime() < 60 * 60 * 1000)
    throw new FxError("Exchange rate moved too fast; try again shortly.");
  await db.fxCache.upsert({ where: { currency }, create: { currency, btcPrice: price, fetchedAt: new Date() }, update: { btcPrice: price, fetchedAt: new Date() } });
  return price;
}

export async function fiatToSats(amount: number, currency: string): Promise<number> {
  const price = await btcPrice(currency);
  const sats = Math.round((amount / price) * 100_000_000);
  return Math.min(MAX_DEPOSIT_SATS, Math.max(MIN_DEPOSIT_SATS, sats));
}
