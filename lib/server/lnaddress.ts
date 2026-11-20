import { LightningAddress } from "@getalby/lightning-tools/lnurl";
import { decodeInvoice } from "@getalby/lightning-tools/bolt11";
import { withTimeout } from "./nwc";

export async function checkLnAddress(addr: string, sats: number) {
  const ln = new LightningAddress(addr, { proxy: false });
  await withTimeout(ln.fetch(), 8000, "lnurl");
  const d = ln.lnurlpData;
  if (!d) throw new Error("not a payable Lightning address");
  if (sats * 1000 < d.min || sats * 1000 > d.max) throw new Error("address can't receive this amount");
}

/** Resolve address → invoice for exactly `sats`, verifying the decoded amount. */
export async function invoiceForAddress(addr: string, sats: number, comment: string) {
  const ln = new LightningAddress(addr, { proxy: false });
  await withTimeout(ln.fetch(), 8000, "lnurl");
  const inv = await withTimeout(ln.requestInvoice({ satoshi: sats, comment: ln.lnurlpData?.commentAllowed ? comment : undefined }), 8000, "lnurl");
  const dec = decodeInvoice(inv.paymentRequest);
  if (!dec || dec.satoshi !== sats) throw new Error("refund invoice amount mismatch");
  return { invoice: inv.paymentRequest, paymentHash: dec.paymentHash };
}
