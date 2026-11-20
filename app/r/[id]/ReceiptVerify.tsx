"use client";
import { useEffect, useState } from "react";
import { verifyEvent, type Event } from "nostr-tools/pure";
import { npubEncode } from "nostr-tools/nip19";
import type { Dict } from "@/lib/i18n";

/** Verifies the receipt's Schnorr signature in the browser. */
export function ReceiptVerify({ event, d }: { event: Event; d: Dict }) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => { try { setOk(verifyEvent({ ...event })); } catch { setOk(false); } }, [event]);
  return (
    <div className={`verify ${ok ? "verify--ok" : ok === false ? "verify--bad" : ""}`} role="status">
      <p className="verify__title">{ok === null ? d.verifying : ok ? d.verifiedReceipt : d.notVerified}</p>
      <p className="mono verify__meta">{d.signedBy} {npubEncode(event.pubkey).slice(0, 20)}… · event {event.id.slice(0, 12)}…</p>
    </div>
  );
}
