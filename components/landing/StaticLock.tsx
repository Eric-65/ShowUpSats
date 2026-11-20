/** Static SVG/CSS padlock — fallback for the 3D hero (reduced motion, save-data, slow network, low memory, no WebGL). */
export function StaticLock() {
  return (
    <svg viewBox="0 0 200 240" className="static-lock" role="img" aria-label="A padlock: your deposit is locked, not sent">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <path d="M58 110 V72 a42 42 0 0 1 84 0 V110" fill="none" stroke="var(--lime)" strokeWidth="14" filter="url(#glow)" />
      <rect x="30" y="104" width="140" height="116" rx="14" fill="#141416" stroke="var(--lime)" strokeWidth="3" filter="url(#glow)" />
      <circle cx="100" cy="152" r="12" fill="var(--lime)" />
      <rect x="95" y="156" width="10" height="30" fill="var(--lime)" />
    </svg>
  );
}
