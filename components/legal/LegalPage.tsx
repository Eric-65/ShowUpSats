import { APP_NAME, APP_WORDMARK } from "@/lib/config";
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="/">{APP_WORDMARK}</a>
        <a className="btn btn--outline" href="/" style={{ minHeight: 40, padding: "8px 14px" }}>← Home</a>
      </header>
      <main className="legal section--light">
        <p className="label mono">// {APP_NAME}</p>
        <h1 className="display">{title}</h1>
        <p className="mono legal__date">Last updated: {updated}</p>
        <div className="legal__body">{children}</div>
        <p className="legal__links mono"><a href="/privacy">Privacy policy</a> · <a href="/terms">Terms of service</a> · <a href="/">Home</a></p>
      </main>
    </>
  );
}
