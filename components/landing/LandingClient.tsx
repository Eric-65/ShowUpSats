"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

/** Landing-only behaviours: Lenis smooth scroll, GSAP ScrollTrigger scrubs/pins, full-screen menu, floating CTA. */
export function LandingClient() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let cleanup = () => {};
    (async () => {
      const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([import("lenis"), import("gsap"), import("gsap/ScrollTrigger")]);
      gsap.registerPlugin(ScrollTrigger);
      const lenis = new Lenis({ lerp: 0.1 });
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (t: number) => lenis.raf(t * 1000);
      gsap.ticker.add(raf); gsap.ticker.lagSmoothing(0);
      // giant display words drift on scroll
      gsap.utils.toArray<HTMLElement>("[data-giant]").forEach((el) => {
        gsap.fromTo(el, { xPercent: Number(el.dataset.giant) || -8 }, { xPercent: -(Number(el.dataset.giant) || -8), ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
      });
      // pinned "how it works" steps: scrubbed timeline
      const steps = gsap.utils.toArray<HTMLElement>(".steps__item");
      const mm = gsap.matchMedia();
      mm.add("(min-width: 900px)", () => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: ".steps", start: "top top", end: `+=${steps.length * 60}%`, scrub: 0.6, pin: true } });
        steps.forEach((s, i) => { if (i) tl.fromTo(s, { opacity: 0.15, y: 40 }, { opacity: 1, y: 0, duration: 1 }); });
        tl.fromTo(".steps__bar", { scaleX: 0 }, { scaleX: 1, ease: "none", duration: steps.length }, 0);
      });
      // header becomes translucent once scrolled
      const hdr = document.querySelector(".site-header--landing");
      const onScroll = () => hdr?.classList.toggle("is-scrolled", window.scrollY > 40);
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanup = () => { window.removeEventListener("scroll", onScroll); gsap.ticker.remove(raf); lenis.destroy(); ScrollTrigger.getAll().forEach((t) => t.kill()); mm.revert(); };
    })();
    return () => cleanup();
  }, []);

  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);

  return (
    <>
      <button className="menu-dot landing-menu-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><span /></button>
      {mounted && createPortal(<>
      <AnimatePresence>
        {open && (
          <motion.nav className="menu-panel" aria-label="Menu" initial={{ clipPath: "circle(0% at 95% 4%)" }} animate={{ clipPath: "circle(150% at 95% 4%)" }} exit={{ clipPath: "circle(0% at 95% 4%)" }} transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}>
            <button className="menu-dot menu-close" aria-label="Close menu" onClick={() => setOpen(false)} style={{ background: "var(--ink)" }}><span style={{ background: "var(--lime)", boxShadow: "none", transform: "rotate(45deg)" }} /></button>
            {[["/onboard", "Create your link"], ["/b/demo-braids", "Demo booking page"], ["/login", "Provider log in"], ["#how", "How it works"], ["#security", "Security"]].map(([href, label], i) => (
              <motion.a key={href} href={href} onClick={() => setOpen(false)} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 + i * 0.05 }}>{label}</motion.a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
      <a className="pill-cta" href="/onboard">Create your booking link <span aria-hidden>▶▶</span></a>
      </>, document.body)}
    </>
  );
}
