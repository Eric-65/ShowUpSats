import type { Metadata } from "next";
import { APP_NAME, APP_WORDMARK, ACCEPT_WINDOW_MINUTES } from "@/lib/config";
import { Scramble } from "@/components/landing/Scramble";
import "../landing.css";

export const metadata: Metadata = {
  title: `How it works · ${APP_NAME}`,
  description: "Book, pay a locked deposit, the provider accepts, you show up. Four simple steps.",
};

const STEPS: { k: string; t: string; lines: string[]; link: { href: string; label: string } }[] = [
  { k: "STEP — 01", t: "Book", lines: [
    "Pick a service.",
    "Pick a time.",
    "Add your Lightning address. Refunds go here.",
    "Tick “I agree” to the cancellation policy.",
  ], link: { href: "/b/demo-braids", label: "Open the demo booking page" } },
  { k: "STEP — 02", t: "Pay the deposit", lines: [
    "Pay a small deposit from any Lightning wallet.",
    "Your sats are LOCKED, NOT SENT.",
    `A ${ACCEPT_WINDOW_MINUTES}-minute countdown starts.`,
  ], link: { href: "https://faucet.nwc.dev", label: "Get a free test wallet" } },
  { k: "STEP — 03", t: "Provider accepts", lines: [
    "✓ Accept: the sats go to the provider.",
    `✕ No answer in ${ACCEPT_WINDOW_MINUTES} min: cancelled. You keep your sats.`,
  ], link: { href: "/login", label: "Provider dashboard" } },
  { k: "STEP — 04", t: "Show up", lines: [
    "You get a signed receipt and a 6-digit code.",
    "Show the code when you arrive.",
    "✓ Checked in. Done.",
  ], link: { href: "/b/demo-braids", label: "See the show-up record" } },
];

export default function HowItWorksPage() {
  return (
    <div className="landing how-page">
      <header className="site-header">
        <a className="wordmark" href="/">{APP_WORDMARK}</a>
        <a className="btn btn--outline how-page__home" href="/">← Home</a>
      </header>

      <main className="steps section--dark">
        <p className="label mono label--glow"><Scramble text="// How it works" /></p>
        <h1 className="display how-page__title">Four steps.<br /><span className="hl">Locked, not sent.</span></h1>
        <div className="steps__bar" aria-hidden />
        <ol className="steps__grid">
          {STEPS.map((s) => (
            <li key={s.k} className="steps__item">
              <p className="label mono">{s.k}</p>
              <h2 className="steps__title">{s.t}</h2>
              <ul className="steps__lines">
                {s.lines.map((l) => <li key={l} className={/^[✓✕]/.test(l) ? "is-mark" : undefined}>{l}</li>)}
              </ul>
              {s.link.href.startsWith("http")
                ? <a className="steps__link" href={s.link.href} target="_blank" rel="noopener noreferrer">{s.link.label} ↗</a>
                : <a className="steps__link" href={s.link.href}>{s.link.label} ▶▶</a>}
            </li>
          ))}
        </ol>

        <nav className="steps__try" aria-label="Get started">
          <div>
            <p className="mono steps__who">// I&apos;m booking</p>
            <a className="hl-link" href="/b/demo-braids">Try the demo booking page ▶▶</a>
            <a className="steps__link" href="https://faucet.nwc.dev" target="_blank" rel="noopener noreferrer">Free test wallet ↗</a>
          </div>
          <div>
            <p className="mono steps__who">// I&apos;m a provider</p>
            <a className="hl-link" href="/onboard">Create my booking link ▶▶</a>
            <a className="steps__link" href="/login">Provider log in ▶▶</a>
          </div>
          <div>
            <p className="mono steps__who">// Learn more</p>
            <a className="steps__link" href="/#security">How your money stays safe ▶▶</a>
            <a className="steps__link" href="https://github.com/eric-65/showupsats#readme" target="_blank" rel="noopener noreferrer">Full guide on GitHub ↗</a>
            <a className="steps__link" href="/">Back to home ▶▶</a>
          </div>
        </nav>
      </main>
    </div>
  );
}
