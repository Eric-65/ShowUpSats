"use client";
export function LangToggle({ lang, label }: { lang: "en" | "fr"; label: string }) {
  return (
    <button type="button" className="lang-toggle" aria-label="Switch language"
      onClick={() => { document.cookie = `lang=${lang === "en" ? "fr" : "en"};path=/;max-age=31536000;samesite=lax`; location.reload(); }}>
      {label}
    </button>
  );
}
