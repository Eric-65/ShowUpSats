/** Lines slide up from a mask, staggered 50ms. Pure CSS + the IntersectionObserver in LandingClient.
 *  Text is only hidden once JS has marked the page `anim-ready`, so it can never get stuck invisible. */
export function RevealLines({ lines, as = "h2", className }: { lines: React.ReactNode[]; as?: "h1" | "h2" | "p"; className?: string }) {
  const Tag = as;
  return (
    <Tag className={`reveal-lines ${className ?? ""}`} data-inview>
      {lines.map((l, i) => (
        <span key={i} className="rl"><span className="rl__in" style={{ ["--i" as string]: i }}>{l}</span></span>
      ))}
    </Tag>
  );
}
