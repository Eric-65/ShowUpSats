"use client";
import { useState } from "react";
export function VisibilityToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function toggle() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ showInCommunity: !on }) });
      if (r.ok) setOn(!on); else setErr((await r.json()).error ?? "Couldn't save. Try again.");
    } catch { setErr("You seem to be offline."); } finally { setBusy(false); }
  }
  return (
    <div className="vis">
      <button type="button" role="switch" aria-checked={on} className={`switch ${on ? "is-on" : ""}`} onClick={toggle} disabled={busy}>
        <span className="switch__knob" aria-hidden />
      </button>
      <div>
        <p className="vis__title">{on ? "✓ You're visible in the community" : "You're hidden from the community"}</p>
        <p className="vis__help">{on ? "Your first name, last initial and Google photo show on the community wall. Your email is never shown." : "Turn on to show your first name and photo on the community wall. You still count toward the member total."}</p>
        {err && <p className="error" role="alert">{err}</p>}
      </div>
    </div>
  );
}
