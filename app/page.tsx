import { APP_NAME, APP_WORDMARK } from "@/lib/config";
/* Landing placeholder — the full M10 design is built once the template images arrive. */
export default function Home() {
  return (
    <>
      <header className="site-header"><a className="wordmark" href="/">{APP_WORDMARK}</a></header>
      <main className="landing">
        <h1 className="display">SHOW UP.</h1>
        <p>{APP_NAME}: booking links where the client&apos;s Lightning deposit is <strong>locked, not sent</strong> until you accept.</p>
        <p><a className="btn btn--lime" href="/onboard">Create your booking link ▶▶</a> <a href="/b/demo-braids">See a demo booking page</a> · <a href="/login">Provider log in</a></p>
      </main>
    </>
  );
}
