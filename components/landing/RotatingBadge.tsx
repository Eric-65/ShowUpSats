export function RotatingBadge({ text = "LOCKED · NOT SENT · LOCKED · NOT SENT · " }: { text?: string }) {
  return (
    <svg className="badge-rotate" viewBox="0 0 132 132" aria-hidden>
      <defs><path id="circ" d="M66,66 m-52,0 a52,52 0 1,1 104,0 a52,52 0 1,1 -104,0" /></defs>
      <text><textPath href="#circ">{text}</textPath></text>
      <circle cx="66" cy="66" r="7" fill="var(--lime)" />
    </svg>
  );
}
