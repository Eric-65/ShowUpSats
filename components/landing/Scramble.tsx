"use client";
import { useEffect, useRef } from "react";
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#·—▶";
/** Decodes mono labels from random glyphs when they scroll into view. */
export function Scramble({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const run = () => {
      const start = performance.now(), dur = 700;
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / dur), solved = Math.floor(p * text.length);
        el.textContent = [...text].map((c, i) => (i < solved || c === " " ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join("");
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { run(); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(el);
    const hover = () => { cancelAnimationFrame(raf); run(); };
    el.addEventListener("mouseenter", hover);
    return () => { io.disconnect(); cancelAnimationFrame(raf); el.removeEventListener("mouseenter", hover); };
  }, [text]);
  return <span ref={ref} className={className} aria-label={text}>{text}</span>;
}
