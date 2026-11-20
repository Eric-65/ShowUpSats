"use client";
import { useEffect, useRef, useState } from "react";
import { t, type Dict } from "@/lib/i18n";
import { Countdown } from "@/components/Countdown";

type Service = { id: string; name: string; durationMin: number; price: string; deposit: string };
type Slot = { id: string; day: string; time: string };
type Status = { status: string; invoice: string | null; acceptDeadline: string; depositSats: number; checkInCode: string | null };

export function BookingFlow(props: {
  slug: string; providerName: string; services: Service[]; slots: Slot[]; policyText: string; policyHash: string;
  windowMin: number; demo: boolean; d: Dict;
}) {
  const { d, providerName } = props;
  const [serviceId, setServiceId] = useState(props.services[0]?.id ?? "");
  const [slotId, setSlotId] = useState("");
  const [ln, setLn] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [booking, setBooking] = useState<{ id: string; token: string } | null>(null);
  const [st, setSt] = useState<Status | null>(null);
  const [copied, setCopied] = useState(false);
  const payRef = useRef<HTMLDivElement>(null);

  // resume after reload
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const id = q.get("booking"), token = q.get("t");
    if (id && token) setBooking({ id, token });
  }, []);

  // poll status every 3s
  useEffect(() => {
    if (!booking) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/bookings/${booking.id}/status?t=${booking.token}`, { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) { setErr(j.error ?? d.errorGeneric); return; }
        if (!stop) setSt(j);
        if (["held", "accepted"].includes(j.status) && j.status === "accepted") navigator.vibrate?.(30);
      } catch { setErr(d.errorNetwork); }
    };
    tick();
    const iv = setInterval(() => { if (!document.hidden) tick(); }, 3000);
    return () => { stop = true; clearInterval(iv); };
  }, [booking, d]);

  // Bitcoin Connect inline payment (QR + wallet connect), loaded only when needed
  useEffect(() => {
    if (!st?.invoice || st.status !== "pending_payment" || !payRef.current || props.demo) return;
    let cancelled = false;
    import("@getalby/bitcoin-connect").then(({ init }) => {
      if (cancelled || !payRef.current) return;
      init({ appName: "ShowUpSats", showBalance: false });
      payRef.current.innerHTML = "";
      const el = document.createElement("bc-payment") as unknown as HTMLElement;
      el.setAttribute("invoice", st.invoice!);
      payRef.current.appendChild(el);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [st?.invoice, st?.status, props.demo]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!slotId) { setErr(d.pickSlot); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/bookings", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: props.slug, serviceId, slotId, lnAddress: ln, policyHash: props.policyHash, agree }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error ?? d.errorGeneric); return; }
      setBooking({ id: j.id, token: j.token });
      history.replaceState(null, "", `?booking=${j.id}&t=${j.token}`);
    } catch { setErr(d.errorNetwork); } finally { setBusy(false); }
  }

  if (booking) {
    const s = st?.status ?? "pending_payment";
    const receiptHref = `/r/${booking.id}?t=${booking.token}`;
    return (
      <section className="pay section--dark" aria-live="polite">
        {err && <p className="error" role="alert">{err}</p>}
        {(s === "pending_payment" || s === "held" || s === "settling") && (
          <>
            <p className="tag tag--lime mono">{d.lockedNotSent}</p>
            <h2 className="display">{s === "pending_payment" ? d.payTitle : t(d.heldWaiting, { name: providerName })}</h2>
            {st && <Countdown deadline={st.acceptDeadline} totalSec={props.windowMin * 60} label={d.timeLeft} />}
            <p className="pay__copy">{t(d.payCopy, { name: providerName, min: props.windowMin })}</p>
            {s === "pending_payment" && st?.invoice && (
              <div className="pay__invoice">
                <div ref={payRef} className="pay__qr" />
                <p className="pay__actions">
                  <a className="btn btn--lime" href={`lightning:${st.invoice}`}>{d.openWallet}</a>{" "}
                  <button type="button" className="btn btn--outline" onClick={() => { navigator.clipboard.writeText(st.invoice!); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                    {copied ? d.copied : d.copyInvoice}
                  </button>
                </p>
                <p className="pay__sats mono">{st.depositSats.toLocaleString()} sats</p>
                {props.demo && <button type="button" className="btn" onClick={() => fetch(`/api/bookings/${booking.id}/demo-pay`, { method: "POST" })}>{d.simulatePay}</button>}
                <p className="mono pay__waiting typing">{d.waitingPayment}</p>
              </div>
            )}
          </>
        )}
        {(s === "accepted" || s === "checked_in" || s === "completed") && (
          <div className="pay__done">
            <svg className="check-draw" viewBox="0 0 52 52" width="64" height="64" aria-hidden><path d="M14 27 l8 8 l16 -18" fill="none" stroke="currentColor" strokeWidth="4" /></svg>
            <h2 className="display">{d.acceptedTitle}</h2>
            <p>{t(d.acceptedCopy, { name: providerName })}</p>
            <a className="btn btn--lime" href={receiptHref}>{d.viewReceipt} ▶▶</a>
          </div>
        )}
        {(s === "expired" || s === "declined") && (
          <div className="pay__ended">
            <h2 className="display">{s === "expired" ? d.expiredTitle : d.declinedTitle}</h2>
            <p>{s === "expired" ? d.expiredCopy : t(d.declinedCopy, { name: providerName })}</p>
            <a className="btn btn--outline" href={`/b/${props.slug}`}>{d.tryAnother}</a>
          </div>
        )}
        {!["pending_payment", "held", "settling", "accepted", "checked_in", "completed", "expired", "declined"].includes(s) && (
          <p><a className="btn" href={receiptHref}>{d.viewReceipt}</a></p>
        )}
      </section>
    );
  }

  const svc = props.services.find((x) => x.id === serviceId);
  return (
    <form className="book-form section--light" onSubmit={submit}>
      <fieldset className="book-form__services">
        <legend className="label mono">STEP — 01 · {d.pickService}</legend>
        {props.services.map((s) => (
          <label key={s.id} className="option">
            <input type="radio" name="service" value={s.id} checked={serviceId === s.id} onChange={() => setServiceId(s.id)} />
            <span className="option__name">{s.name}</span>{" "}
            <span className="option__meta mono">{s.durationMin} min · {d.price} {s.price} · {d.deposit} {s.deposit}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="book-form__slots">
        <legend className="label mono">STEP — 02 · {d.pickSlot}</legend>
        {props.slots.length === 0 ? <p>{d.noSlots}</p> : props.slots.map((s) => (
          <label key={s.id} className="slot">
            <input type="radio" name="slot" value={s.id} checked={slotId === s.id} onChange={() => setSlotId(s.id)} />
            <span className="mono">{s.day} · {s.time}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="book-form__ln">
        <legend className="label mono">STEP — 03 · {d.yourLnAddress}</legend>
        <input type="email" inputMode="email" autoComplete="off" required placeholder="you@getalby.com" value={ln} onChange={(e) => setLn(e.target.value)} aria-describedby="ln-help" />
        <p id="ln-help" className="help">{d.lnAddressHelp}</p>
      </fieldset>
      <fieldset className="book-form__policy">
        <legend className="label mono">STEP — 04 · {d.policyTitle}</legend>
        <blockquote className="policy accent-bar"><pre className="policy__text">{props.policyText}</pre></blockquote>
        <label className="agree">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required /> {d.agree}
        </label>
      </fieldset>
      {err && <p className="error" role="alert">{err}</p>}
      <button className="btn btn--lime btn--block" disabled={busy || !agree || !slotId}>
        {busy ? d.working : `${d.bookAndPay}${svc ? ` · ${svc.deposit}` : ""}`} ▶▶
      </button>
    </form>
  );
}
