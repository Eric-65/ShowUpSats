"use client";
import { useCallback, useEffect, useState } from "react";
import { t, type Dict } from "@/lib/i18n";
import { StatusChip } from "@/components/StatusChip";
import { Countdown } from "@/components/Countdown";
import { AnimatePresence, motion } from "framer-motion";

const TZ = process.env.NEXT_PUBLIC_DISPLAY_TZ || "Africa/Lagos";

type Row = {
  id: string; status: string; service: string; slotStart: string; depositSats: number; depositFiat: number; acceptDeadline: string; hashTail: string;
  refund: { status: string; error: string | null } | null; report: { outcome: string | null; deadline: string | null } | null;
  client: { past: number; noShows: number };
};

export function Dashboard({ initial, d, lang, currency, windowMin }: { initial: Row[]; d: Dict; lang: "en" | "fr"; currency: string; windowMin: number }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try { const r = await fetch("/api/dashboard", { cache: "no-store" }); if (r.ok) setRows((await r.json()).bookings); } catch {}
  }, []);
  useEffect(() => { const iv = setInterval(() => { if (!document.hidden) load(); }, 4000); return () => clearInterval(iv); }, [load]);

  async function act(id: string, action: string, extra: Record<string, string> = {}) {
    setBusy(id + action); setMsg((m) => ({ ...m, [id]: "" }));
    try {
      const r = await fetch(`/api/bookings/${id}/action`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
      const j = await r.json();
      if (!r.ok) setMsg((m) => ({ ...m, [id]: j.error ?? d.errorGeneric }));
      else if (action === "accept") navigator.vibrate?.(30);
      await load();
    } catch { setMsg((m) => ({ ...m, [id]: d.errorNetwork })); } finally { setBusy(null); }
  }

  const fmtFiat = (n: number) => { try { return new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(n); } catch { return `${n} ${currency}`; } };
  const fmtWhen = (iso: string) => new Date(iso).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  if (!rows.length) return <p>{d.noBookings}</p>;
  return (
    <ol className="dash__list">
      <AnimatePresence initial={false}>
      {rows.map((b, i) => {
        const started = Date.now() > new Date(b.slotStart).getTime();
        return (
          <motion.li key={b.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }} className={`dash__row dash__row--${b.status}`}>
            <span className="dash__idx mono">{String(i + 1).padStart(3, "0")}</span>
            <div className="dash__main">
              <StatusChip status={b.status} lang={lang} />
              <p className="dash__svc">{b.service}</p>
              <p className="mono">{fmtWhen(b.slotStart)} · {fmtFiat(b.depositFiat)} · {b.depositSats.toLocaleString()} sats · …{b.hashTail}</p>
              <p className="mono dash__client">{t(d.clientRecord, { past: b.client.past, noShows: b.client.noShows })}</p>
              {b.status === "held" && <Countdown deadline={b.acceptDeadline} totalSec={windowMin * 60} label={d.timeLeft} size={72} />}
              {b.refund && b.refund.status !== "paid" && <p className="error">{d.refundFailed}{b.refund.error === "QUOTA_EXCEEDED" ? " — Your refund budget is used up. Raise it in your wallet." : ""}</p>}
              {b.report?.deadline && !b.report.outcome && <p className="error">⚠ {t(d.respondBy, { when: fmtWhen(b.report.deadline) })}</p>}
              {msg[b.id] && <p className="error" role="alert">{msg[b.id]}</p>}
            </div>
            <div className="dash__actions">
              {b.status === "held" && <>
                <button className="btn btn--lime" disabled={!!busy} onClick={() => act(b.id, "accept")}>{busy === b.id + "accept" ? d.working : `✓ ${d.accept}`}</button>
                <button className="btn btn--outline" disabled={!!busy} onClick={() => act(b.id, "decline")}>✕ {d.decline}</button>
              </>}
              {b.status === "accepted" && <>
                <form className="checkin-form" onSubmit={(e) => { e.preventDefault(); act(b.id, "checkin", { code: codes[b.id] ?? "" }); }}>
                  <label className="mono">{d.enterCode}
                    <input inputMode="numeric" pattern="\d{6}" maxLength={6} value={codes[b.id] ?? ""} onChange={(e) => setCodes((c) => ({ ...c, [b.id]: e.target.value.replace(/\D/g, "") }))} />
                  </label>
                  <button className="btn btn--lime" disabled={!!busy}>{d.checkInBtn}</button>
                </form>
                {!started && <button className="btn btn--outline" disabled={!!busy} onClick={() => confirm(d.cancelAndRefund + "?") && act(b.id, "cancel")}>↩ {d.cancelAndRefund}</button>}
                {started && <button className="btn btn--outline" disabled={!!busy} onClick={() => act(b.id, "no_show")}>⚠ {d.markNoShow}</button>}
              </>}
              {b.status === "checked_in" && <button className="btn btn--lime" disabled={!!busy} onClick={() => act(b.id, "complete")}>✓ {d.markCompleted}</button>}
              {b.status === "stylist_absent_reported" && <>
                <button className="btn btn--lime" disabled={!!busy} onClick={() => act(b.id, "refund")}>↩ {d.refundClient}</button>
                <input placeholder={d.disputeNote} maxLength={280} value={notes[b.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [b.id]: e.target.value }))} />
                <button className="btn btn--outline" disabled={!!busy} onClick={() => act(b.id, "dispute", { note: notes[b.id] ?? "" })}>⚖ {d.dispute}</button>
                <button className="btn btn--outline" disabled={!!busy} onClick={() => act(b.id, "no_show")}>⚠ {d.markNoShow}</button>
              </>}
              {b.refund && b.refund.status === "failed" && <button className="btn btn--outline" disabled={!!busy} onClick={() => act(b.id, "retry_refund")}>{d.retryRefund}</button>}
            </div>
          </motion.li>
        );
      })}
      </AnimatePresence>
    </ol>
  );
}
