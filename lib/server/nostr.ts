import "./ws-polyfill";
import { finalizeEvent, getPublicKey } from "nostr-tools/pure";
import { SimplePool } from "nostr-tools/pool";
import * as nip19 from "nostr-tools/nip19";
import { NOSTR_RELAYS, APP_NAME } from "../config";
import { withTimeout } from "./nwc";

function secretKey(): Uint8Array {
  const nsec = process.env.APP_NOSTR_NSEC;
  if (!nsec) throw new Error("APP_NOSTR_NSEC missing");
  const d = nip19.decode(nsec);
  if (d.type !== "nsec") throw new Error("APP_NOSTR_NSEC must be an nsec");
  return d.data;
}
export const appPubkey = () => getPublicKey(secretKey());
export const appNpub = () => nip19.npubEncode(appPubkey());

/** Sign + publish (best effort; signature is valid even if relays are down). */
export async function signAndPublish(kindTag: "receipt" | "record", content: object, extraTags: string[][] = []) {
  const ev = finalizeEvent({
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [["t", "showupsats"], ["t", `showupsats-${kindTag}`], ["client", APP_NAME], ...extraTags],
    content: JSON.stringify(content),
  }, secretKey());
  let published = 0;
  const pool = new SimplePool();
  try {
    const results = await withTimeout(Promise.allSettled(pool.publish(NOSTR_RELAYS, ev)), 6000, "nostr").catch(() => []);
    published = (results as PromiseSettledResult<string>[]).filter((r) => r.status === "fulfilled").length;
  } finally {
    try { pool.close(NOSTR_RELAYS); } catch {}
  }
  return { event: ev, published };
}
