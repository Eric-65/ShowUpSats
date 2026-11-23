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
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); } }), { threshold: 0.15 });
    document.documentElement.classList.add("anim-ready");
    document.querySelectorAll("[data-inview]").forEach((el) => io.observe(el));
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return () => io.disconnect();
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
      if (steps.length) mm.add("(min-width: 900px)", () => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: ".steps", start: "top top", end: `+=${steps.length * 60}%`, scrub: 0.6, pin: true } });
        steps.forEach((s, i) => { if (i) tl.fromTo(s, { opacity: 0.15, y: 40 }, { opacity: 1, y: 0, duration: 1 }); });
        tl.fromTo(".steps__bar", { scaleX: 0 }, { scaleX: 1, ease: "none", duration: steps.length }, 0);
      });
      // giant words: letters rise and un-skew as they scroll into view (scrubbed)
      gsap.utils.toArray<HTMLElement>("[data-giant-chars]").forEach((el) => {
        gsap.fromTo(el.querySelectorAll(".ch"), { yPercent: 70, rotate: 8, opacity: 0 }, {
          yPercent: 0, rotate: 0, opacity: 1, stagger: 0.04, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 95%", end: "top 45%", scrub: 0.8 },
        });
      });
      // paragraphs: words light up one by one as you scroll
      gsap.utils.toArray<HTMLElement>("[data-scrub-words]").forEach((el) => {
        gsap.fromTo(el.querySelectorAll(".w"), { opacity: 0.12 }, {
          opacity: 1, stagger: 0.08, ease: "none",
          scrollTrigger: { trigger: el, start: "top 85%", end: "bottom 55%", scrub: true },
        });
      });
      // steps titles: chars typed in sequence when pinned section starts
      gsap.utils.toArray<HTMLElement>(".steps__title").forEach((el, i) => {
        gsap.fromTo(el, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.9, delay: i * 0.12, ease: "power2.out", scrollTrigger: { trigger: ".steps", start: "top 70%" } });
      });
      // gallery parallax: each figure moves at its own speed
      gsap.utils.toArray<HTMLElement>("[data-speed]").forEach((el) => {
        gsap.fromTo(el, { yPercent: -Number(el.dataset.speed) }, { yPercent: Number(el.dataset.speed), ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
      });
      // header becomes translucent once scrolled
      const hdr = document.querySelector(".site-header--landing");
      const onScroll = () => hdr?.classList.toggle("is-scrolled", window.scrollY > 40);
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanup = () => { io.disconnect(); window.removeEventListener("scroll", onScroll); gsap.ticker.remove(raf); lenis.destroy(); ScrollTrigger.getAll().forEach((t) => t.kill()); mm.revert(); };
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
            {[["/onboard", "Create your link"], ["/b/demo-braids", "Demo booking page"], ["/login", "Provider log in"], ["/how-it-works", "How it works"], ["#security", "Security"]].map(([href, label], i) => (
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
