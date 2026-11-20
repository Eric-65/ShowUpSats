"use client";
import { useEffect, useRef } from "react";
/** Greyscale photo that "signal-distorts" on hover and once on scroll-in. */
export function GlitchImage({ src, alt, className, priority }: { src: string; alt: string; className?: string; priority?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add("is-glitching"); setTimeout(() => el.classList.remove("is-glitching"), 700); io.disconnect(); }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`glitch photo ${className ?? ""}`} style={{ ["--glitch-img" as string]: `url(${src})` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} />
      <span className="glitch__slice" aria-hidden /><span className="glitch__slice" aria-hidden /><span className="glitch__slice" aria-hidden />
    </div>
  );
}
