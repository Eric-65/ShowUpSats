"use client";
import { useEffect, useState } from "react";
/** SVG ring countdown (stroke animates as time runs out). */
export function Countdown({ deadline, totalSec, label, size = 120 }: { deadline: string; totalSec: number; label: string; size?: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, []);
  const left = Math.max(0, Math.round((new Date(deadline).getTime() - now) / 1000));
  const frac = Math.min(1, left / totalSec);
  const r = 44, c = 2 * Math.PI * r;
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  return (
    <div className={`countdown${left <= 60 ? " countdown--urgent" : ""}`} role="timer" aria-label={`${mm}:${ss} ${label}`}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
        <circle cx="50" cy="50" r={r} className="countdown__track" fill="none" strokeWidth="4" />
        <circle cx="50" cy="50" r={r} className="countdown__ring" fill="none" strokeWidth="4"
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 50 50)" />
      </svg>
      <span className="countdown__time mono">{mm}:{ss}</span>
      <span className="countdown__label mono">{label}</span>
    </div>
  );
}
