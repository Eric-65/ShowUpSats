/**
 * Thin wallet abstraction over NWC. In DEMO_MODE (explicit fallback only) payments are simulated.
 */
import { DEMO_MODE } from "../config";
import { satsToMsats } from "../units";
import { withNwc } from "./nwc";
import { sha256Hex } from "./crypto";

export type InvoiceState = "pending" | "accepted" | "settled" | "failed" | "unknown";

export interface ReceiveWallet {
  makeHold(sats: number, paymentHash: string, description: string, expirySec: number): Promise<string>;
  lookup(paymentHash: string): Promise<InvoiceState>;
  settle(preimage: string): Promise<void>;
  cancel(paymentHash: string): Promise<void>;
}
export interface RefundWallet {
  pay(invoice: string): Promise<{ preimage: string }>;
}

// ---------- DEMO (simulated) ----------
const demoPaid = new Map<string, number>(); // paymentHash -> paidAt
export function demoMarkPaid(hash: string) { demoPaid.set(hash, Date.now()); }
const demoReceive: ReceiveWallet = {
  async makeHold(sats, hash) { return `lntbs${sats}demo1${hash.slice(0, 40)}`; },
  async lookup(hash) { return demoPaid.has(hash) ? "accepted" : "pending"; },
  async settle() {}, async cancel() {},
};
const demoRefund: RefundWallet = { async pay(inv) { return { preimage: sha256Hex(inv) }; } };

// ---------- Real NWC ----------
export function receiveWallet(uri: string | null): ReceiveWallet {
  if (DEMO_MODE) return demoReceive;
  if (!uri) throw new Error("NO_RECEIVE_CONNECTION");
  return {
    makeHold: (sats, payment_hash, description, expiry) =>
      withNwc(uri, async (c) => (await c.makeHoldInvoice({ amount: satsToMsats(sats), payment_hash, description, expiry })).invoice),
    lookup: (payment_hash) =>
      withNwc(uri, async (c) => {
        const t = await c.lookupInvoice({ payment_hash });
        return (t.state ?? "unknown") as InvoiceState;
      }),
    settle: (preimage) => withNwc(uri, async (c) => { await c.settleHoldInvoice({ preimage }); }),
    cancel: (payment_hash) => withNwc(uri, async (c) => { await c.cancelHoldInvoice({ payment_hash }); }),
  };
}
export function refundWallet(uri: string | null): RefundWallet {
  if (DEMO_MODE) return demoRefund;
  if (!uri) throw new Error("NO_REFUND_CONNECTION");
  return { pay: (invoice) => withNwc(uri, async (c) => ({ preimage: (await c.payInvoice({ invoice })).preimage })) };
}
