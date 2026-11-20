"use client";
import { useState } from "react";
import { t, type Dict } from "@/lib/i18n";

type Svc = { name: string; durationMin: number; priceFiat: number; depositFiat: number };

export function Onboarding({ d, currencies, defaultPolicy, startStep }: { d: Dict; currencies: string[]; defaultPolicy: string; startStep: number }) {
  const [step, setStep] = useState(startStep);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [budget, setBudget] = useState<{ usedSats: number; totalSats: number; renewal: string } | null>(null);
  const [f, setF] = useState({ displayName: "", slug: "", currency: "NGN", language: "en", cancelNoticeHours: 24, policyText: defaultPolicy });
  const [services, setServices] = useState<Svc[]>([{ name: "", durationMin: 60, priceFiat: 0, depositFiat: 0 }]);
  const [uri, setUri] = useState("");

  async function post(url: string, body: unknown) {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) { setErr(j.error ?? d.errorGeneric); return null; }
      return j;
    } catch { setErr(d.errorNetwork); return null; } finally { setBusy(false); }
  }

  return (
    <div className="onboard__wrap">
      <p className="label mono">{d.step} — 0{Math.min(step, 3)} / 03</p>
      {err && <p className="error" role="alert">{err}</p>}

      {step === 1 && (
        <form className="form" onSubmit={async (e) => {
          e.preventDefault();
          const j = await post("/api/onboard/profile", { ...f, services });
          if (j) { setKey(j.dashboardKey); setStep(2); }
        }}>
          <label>{d.yourName}<input required value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value, slug: f.slug || "" })} /></label>
          <label>{d.linkName} <span className="mono">/b/</span><input required pattern="[a-z0-9-]{3,40}" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></label>
          <label>{d.currency}<select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>{currencies.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label>{d.language}<select value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}><option value="en">English</option><option value="fr">Français</option></select></label>
          <label>{d.cancelNoticeHours}<input type="number" min={0} max={168} value={f.cancelNoticeHours} onChange={(e) => {
            const h = Number(e.target.value); setF({ ...f, cancelNoticeHours: h, policyText: f.policyText.replace(/at least \d+ hours/, `at least ${h} hours`) });
          }} /></label>
          <label>{d.policyTitle}<textarea rows={8} value={f.policyText} onChange={(e) => setF({ ...f, policyText: e.target.value })} /></label>
          <fieldset>
            <legend className="label mono">{d.services}</legend>
            {services.map((s, i) => (
              <div key={i} className="svc-row">
                <input aria-label={d.serviceName} placeholder={d.serviceName} required value={s.name} onChange={(e) => setServices(services.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <input aria-label={d.durationMin} type="number" min={10} value={s.durationMin} onChange={(e) => setServices(services.map((x, j) => j === i ? { ...x, durationMin: Number(e.target.value) } : x))} />
                <input aria-label={d.price} placeholder={d.price} type="number" min={1} required value={s.priceFiat || ""} onChange={(e) => setServices(services.map((x, j) => j === i ? { ...x, priceFiat: Number(e.target.value) } : x))} />
                <input aria-label={d.deposit} placeholder={d.deposit} type="number" min={1} required value={s.depositFiat || ""} onChange={(e) => setServices(services.map((x, j) => j === i ? { ...x, depositFiat: Number(e.target.value) } : x))} />
              </div>
            ))}
            <button type="button" className="btn btn--outline" onClick={() => setServices([...services, { name: "", durationMin: 60, priceFiat: 0, depositFiat: 0 }])}>+ {d.addService}</button>
          </fieldset>
          <button className="btn btn--lime" disabled={busy}>{busy ? d.working : d.next} ▶▶</button>
        </form>
      )}

      {step >= 2 && key && (
        <section className="key accent-bar">
          <h2 className="label mono">{d.keyTitle}</h2>
          <p className="mono key__value">{key}</p>
          <p>{d.keyHelp}</p>
        </section>
      )}

      {(step === 2 || step === 3) && (
        <form className="form" onSubmit={async (e) => {
          e.preventDefault();
          const j = await post("/api/onboard/connection", { kind: step === 2 ? "receive" : "refund", uri });
          if (j) { setWarn(j.warning); if (step === 3) setBudget(j.budget); setUri(""); setStep(step + 1); }
        }}>
          <h2>{step === 2 ? d.connA : d.connB}</h2>
          <p className="help">{step === 2 ? d.connAHelp : d.connBHelp}</p>
          <input type="password" autoComplete="off" placeholder={d.paste} value={uri} onChange={(e) => setUri(e.target.value)} required />
          <button className="btn btn--lime" disabled={busy}>{busy ? d.working : d.checkConnection} ▶▶</button>
          {warn && <p className="warning" role="status">⚠ {warn}</p>}
        </form>
      )}

      {step === 4 && (
        <section>
          {budget && <p className="mono">{t(d.budgetCap, { used: budget.usedSats, total: budget.totalSats, renewal: budget.renewal })}</p>}
          {warn && <p className="warning">⚠ {warn}</p>}
          <a className="btn btn--lime" href="/dashboard">{d.goDashboard} ▶▶</a>
        </section>
      )}
    </div>
  );
}
