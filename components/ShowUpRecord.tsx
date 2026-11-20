import type { Dict } from "@/lib/i18n";
type Ev = { id: string; type: string; outcome: string; at: Date; eventId: string | null };
export function ShowUpRecord({ r, d, lang }: { r: { completed: number; refunded: number; unresolved: number; disputed: number; events: Ev[] }; d: Dict; lang: string }) {
  return (
    <section className="record" aria-label={d.showUpRecord}>
      <h2 className="record__title label">{d.showUpRecord}</h2>
      <p className="record__stats mono">
        <span>✓ {r.completed} {d.completed}</span> · <span>↩ {r.refunded} {d.cancelledRefunded}</span> ·{" "}
        <span>⚠ {r.unresolved} {d.unresolvedNoShow}</span> · <span>⚖ {r.disputed} {d.disputed}</span>
      </p>
      <details className="record__events">
        <summary>{d.seeSignedEvents}</summary>
        {r.events.length === 0 ? <p>{d.noEvents}</p> : (
          <ol className="record__list">
            {r.events.map((e) => (
              <li key={e.id} className="record__row mono">
                <time dateTime={new Date(e.at).toISOString()}>{new Date(e.at).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB")}</time>{" "}
                · {e.type.replace(/_/g, " ")} · {e.outcome.replace(/_/g, " ")}
                {e.eventId && <> · <a href={`https://njump.me/${e.eventId}`} rel="noopener noreferrer" target="_blank">sig {e.eventId.slice(0, 8)}…</a></>}
              </li>
            ))}
          </ol>
        )}
        <p className="record__honesty">{d.recordHonesty}</p>
      </details>
    </section>
  );
}
