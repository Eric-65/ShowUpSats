"use client";
import { useState } from "react";
export function InviteShare({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const text = `Join me on ShowUpSats: booking deposits that are locked, not sent. ${link}`;
  return (
    <div className="invite">
      <p className="invite__link mono" aria-label="Your invite link">{link}</p>
      <div className="invite__actions">
        <button type="button" className="btn btn--lime" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {} }}>
          {copied ? "✓ Copied" : "Copy invite link"}
        </button>
        <a className="btn btn--outline" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
        <button type="button" className="btn btn--outline" onClick={() => { if (navigator.share) navigator.share({ title: "ShowUpSats", text, url: link }).catch(() => {}); else navigator.clipboard?.writeText(link); }}>
          Share…
        </button>
      </div>
    </div>
  );
}
