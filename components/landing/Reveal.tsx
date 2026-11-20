"use client";
import { motion, useReducedMotion } from "framer-motion";
/** Lines slide up from a mask, staggered 50ms. */
export function RevealLines({ lines, as = "h2", className }: { lines: React.ReactNode[]; as?: "h1" | "h2" | "p"; className?: string }) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag className={className} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}>
      {lines.map((l, i) => (
        <span key={i} style={{ display: "block", overflow: "hidden", paddingBottom: "0.04em" }}>
          <motion.span style={{ display: "block" }}
            variants={reduce ? { hidden: { opacity: 0 }, show: { opacity: 1 } } : { hidden: { y: "105%" }, show: { y: "0%", transition: { duration: 0.8, ease: [0.2, 0.8, 0.2, 1] } } }}>
            {l}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
