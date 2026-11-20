"use client";
import { useState } from "react";
import { t, type Dict } from "@/lib/i18n";

export function ClientActions(p: { id: string; token: string; status: string; early: boolean; graceOver: boolean; providerName: string; noticeHours: number; refundHours: number; d: Dict }) {
  const { d } = p;
  const [mode, setMode] = useState<"none" | "cancel" | "report">("none");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(action: "cancel" | "report_absent") {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/bookings/${p.id}/client`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: p.token, action, note: note || undefined }) });
      const j = await r.json();
      if (!r.ok) setErr(j.error ?? d.errorGeneric);
      else if (action === "report_absent") setMsg(t(d.reportSent, { name: p.providerName, hours: p.refundHours }));
      else location.reload();
    } catch { setErr(d.errorNetwork); } finally { setBusy(false); }
  }

  const canCancel = p.status === "accepted" && !p.graceOver;
  const canReport = (p.status === "accepted" || p.status === "client_no_show") && p.graceOver;
  if (!canCancel && !canReport) return null;
  return (
    <section className="client-actions">
      {err && <p className="error" role="alert">{err}</p>}
      {msg && <p role="status">{msg}</p>}
      {canCancel && mode !== "cancel" && <button className="btn btn--outline" onClick={() => setMode("cancel")}>{d.cancelBooking}</button>}
      {canCancel && mode === "cancel" && (
        <div className="confirm">
          <p>{t(p.early ? d.cancelEarly : d.cancelLate, { hours: p.noticeHours })}</p>
          <button className="btn btn--danger" disabled={busy} onClick={() => send("cancel")}>{busy ? d.working : d.confirmCancel}</button>
        </div>
      )}
      {canReport && !msg && (
        mode !== "report" ? <button className="btn btn--outline" onClick={() => setMode("report")}>{t(d.reportAbsent, { name: p.providerName })}</button> : (
          <div className="confirm">
            <label>{d.reportNote}<textarea maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} /></label>
            <button className="btn btn--danger" disabled={busy} onClick={() => send("report_absent")}>{busy ? d.working : d.sendReport}</button>
          </div>
        )
      )}
    </section>
  );
}
