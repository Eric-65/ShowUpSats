import { STATUS_LABEL } from "@/lib/i18n";
export function StatusChip({ status, lang = "en" }: { status: string; lang?: "en" | "fr" }) {
  const s = STATUS_LABEL[status] ?? { en: status.toUpperCase(), fr: status.toUpperCase(), icon: "·", tone: "grey" as const };
  return <span className={`chip chip--${s.tone}`} data-status={status}><span className="chip__dot" aria-hidden>{s.icon}</span> {s[lang]}</span>;
}
