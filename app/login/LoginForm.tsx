"use client";
import { useState } from "react";
import type { Dict } from "@/lib/i18n";
export function LoginForm({ d }: { d: Dict }) {
  const [slug, setSlug] = useState(""); const [key, setKey] = useState("");
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  return (
    <form className="form" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr(null);
      try {
        const r = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, key }) });
        const j = await r.json(); if (!r.ok) setErr(j.error); else location.href = "/dashboard";
      } catch { setErr(d.errorNetwork); } finally { setBusy(false); }
    }}>
      <label>{d.linkName}<input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} required autoComplete="username" /></label>
      <label>{d.dashboardKey}<input type="password" value={key} onChange={(e) => setKey(e.target.value)} required autoComplete="current-password" /></label>
      {err && <p className="error" role="alert">{err}</p>}
      <button className="btn btn--lime" disabled={busy}>{busy ? d.working : d.login} ▶▶</button>
    </form>
  );
}
