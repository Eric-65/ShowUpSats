/** Server-safe text splitters: no JS shipped. Screen readers get the whole string via aria-label. */
import React from "react";

export function SplitChars({ text, className, delayMs = 0, step = 35 }: { text: string; className?: string; delayMs?: number; step?: number }) {
  let i = 0;
  return (
    <span className={`split-chars ${className ?? ""}`} aria-label={text} role="text">
      {text.split(" ").map((word, wi, arr) => (
        <span key={wi} className="split-word" aria-hidden>
          {[...word].map((ch) => (
            <span key={i} className="ch" style={{ ["--i" as string]: i++, ["--d" as string]: `${delayMs}ms`, ["--step" as string]: `${step}ms` }}>{ch}</span>
          ))}
          {wi < arr.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

/** Words wrapped for scroll-scrubbed reveals (animated by LandingClient). */
export function SplitWords({ children, className }: { children: string; className?: string }) {
  return (
    <span className={`split-words ${className ?? ""}`} data-scrub-words>
      {children.split(/(\s+)/).map((w, i) => (/\s+/.test(w) ? w : <span key={i} className="w">{w}</span>))}
    </span>
  );
}

/** Infinite text ticker (pure CSS). */
export function Marquee({ items, className }: { items: string[]; className?: string }) {
  const row = items.map((t, i) => <span key={i} className="marquee__item">{t}<span className="marquee__sep" aria-hidden>✦</span></span>);
  return (
    <div className={`marquee ${className ?? ""}`} aria-label={items.join(", ")} role="marquee">
      <div className="marquee__track" aria-hidden>{row}{row}</div>
    </div>
  );
}
