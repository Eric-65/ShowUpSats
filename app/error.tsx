"use client";
/** Friendly fallback instead of Next's blank "Application error" screen. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="section--dark" style={{ minHeight: "80vh", padding: "64px var(--gutter)" }}>
      <p className="label mono">// Something went wrong</p>
      <h1 className="display">Not loaded.<br /><span className="hl">Nothing was charged.</span></h1>
      <p style={{ maxWidth: "46ch" }}>This page couldn&apos;t load right now. No payment was taken. Try again in a moment. If it keeps happening, the site owner can check <a href="/api/health">/api/health</a>.</p>
      <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="btn btn--lime" onClick={() => reset()}>Try again ▶▶</button>
        <a className="btn btn--outline" href="/">Back to home</a>
      </p>
    </main>
  );
}
