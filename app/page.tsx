import { APP_NAME, APP_WORDMARK, ACCEPT_WINDOW_MINUTES } from "@/lib/config";
import { db } from "@/lib/server/db";
import { providerRecord } from "@/lib/server/records";
import { HeroVisual } from "@/components/landing/HeroVisual";
import { LandingClient } from "@/components/landing/LandingClient";
import { RevealLines } from "@/components/landing/Reveal";
import { GlitchImage } from "@/components/landing/Glitch";
import { RotatingBadge } from "@/components/landing/RotatingBadge";
import { Scramble } from "@/components/landing/Scramble";
import { SplitChars, SplitWords, Marquee } from "@/components/SplitText";
import "./landing.css";

export const dynamic = "force-dynamic";

const STEPS = [
  { k: "STEP — 01", t: "Share your link", d: "Pick your services, deposit and cancellation policy. Paste two wallet connections. Send the link on WhatsApp." },
  { k: "STEP — 02", t: "Client locks a deposit", d: "They pick a slot and pay a small Lightning deposit. It's a hold invoice: locked in their payment, not sent." },
  { k: "STEP — 03", t: `Accept in ${ACCEPT_WINDOW_MINUTES} minutes`, d: "Tap Accept and the sats land in your own wallet. Decline or miss it, and the hold cancels itself." },
  { k: "STEP — 04", t: "Check-in proves the show-up", d: "The client shows a 6-digit code when they arrive. Both sides keep a Nostr-signed receipt." },
];

export default async function Home() {
  const demo = await db.provider.findUnique({ where: { slug: "demo-braids" }, select: { id: true, displayName: true } }).catch(() => null);
  const rec = demo ? await providerRecord(demo.id).catch(() => null) : null;

  return (
    <div className="landing">
      <header className="site-header site-header--landing">
        <a className="wordmark" href="/">{APP_WORDMARK}</a>
        <LandingClient />
      </header>

      {/* HERO */}
      <section className="hero section--dark">
        <p className="label mono hero__idx"><Scramble text="// 001 · Booking deposits for one-person businesses" /></p>
        <h1 className="display hero__title">
          <span className="line"><SplitChars text="Locked." /></span>
          <span className="line"><SplitChars text="Not sent." delayMs={220} /></span>
          <span className="line hl hl--flicker"><SplitChars text="Show up." delayMs={480} /></span>
        </h1>
        <div className="hero__grid">
          <HeroVisual />
          <GlitchImage src="/img/portrait-suit.webp" alt="A barber in a dark suit, in shadow" className="hero__photo" priority />
        </div>
        <p className="lede hero__lede" data-inview>
          A booking link where the client&apos;s deposit is <span className="hl">locked, not sent</span>, until you accept. Miss the window and they <span className="hl">keep their sats</span>.
        </p>
        <div className="hero__cta">
          <a className="btn btn--lime" href="/onboard">Create your booking link ▶▶</a>
          <a className="btn btn--outline" href="/b/demo-braids">See a booking page</a>
          <RotatingBadge />
        </div>
      </section>

      <Marquee className="marquee--lime" items={["Locked, not sent", "Accept in 10 minutes", "Or the client keeps their sats", "Signed receipts", "Check-in codes", "Show-up records"]} />

      {/* PROBLEM */}
      <section className="problem section--light">
        <p className="label mono"><Scramble text="// 002 · The empty chair" /></p>
        <div className="giant-wrap"><p className="giant" data-giant="-6" data-giant-chars><SplitChars text="Saturday, 9:00" /></p></div>
        <div className="problem__grid">
          <div className="photo problem__photo"><img src="/img/hands-sm.webp" srcSet="/img/hands-sm.webp 700w, /img/hands.webp 1400w" sizes="(min-width: 900px) 50vw, 100vw" alt="Shadows of hands pressed against a sheet" loading="lazy" /></div>
          <div className="problem__copy accent-bar">
            <RevealLines as="h2" className="display" lines={["The chair", "stays empty."]} />
            <p>A braider blocks four hours for a client who never comes. That&apos;s a day&apos;s rent, gone. She asks for a deposit next time, and the client says no: <strong>why send money to a stranger who might cancel on me?</strong></p>
            <p className="scrub-p"><SplitWords>{`Both sides are right. Neither has a way to trust the other. ${APP_NAME} fixes the deposit, not the people.`}</SplitWords></p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="steps section--dark">
        <p className="label mono"><Scramble text="// 003 · How it works" /></p>
        <div className="steps__bar" aria-hidden />
        <ol className="steps__grid">
          {STEPS.map((s) => (
            <li key={s.k} className="steps__item">
              <p className="label mono">{s.k}</p>
              <h3 className="steps__title">{s.t}</h3>
              <p>{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="steps__photos">
          <figure className="gal gal--lg" data-speed="-6">
            <div className="photo"><img src="/img/veil.webp" srcSet="/img/veil-sm.webp 700w, /img/veil.webp 1400w" sizes="(min-width: 900px) 42vw, 100vw" alt="Eyes above a dark scarf" loading="lazy" /></div>
            <figcaption className="mono">FIG. 01 · Waiting</figcaption>
          </figure>
          <figure className="gal gal--sm" data-speed="10">
            <div className="photo"><img src="/img/eyes-sm.webp" alt="A child's eyes in deep shadow" loading="lazy" /></div>
            <figcaption className="mono">FIG. 02 · Locked</figcaption>
          </figure>
          <figure className="gal gal--md" data-speed="-8">
            <div className="photo"><img src="/img/laugh-sm.webp" alt="A woman laughing, side profile" loading="lazy" /></div>
            <figcaption className="mono">FIG. 03 · Showed up</figcaption>
          </figure>
        </div>
      </section>

      {/* LOCKED NOT SENT */}
      <section className="locked section--dark">
        <p className="label mono"><Scramble text="// 004 · Locked, not sent" /></p>
        <div className="locked__grid">
          <GlitchImage src="/img/coin.webp" alt="A coin dissolving into particles" className="locked__photo" />
          <div>
            <p className="lede locked__lede" data-inview>
              A hold invoice is a payment that <span className="hl">waits</span>. The sats leave nobody&apos;s wallet until the provider says yes. <span className="hl">Yes</span> settles it. <span className="hl">No, or silence</span>, cancels it. The client never has to ask for money back.
            </p>
            <ul className="locked__list mono">
              <li><span>✓ ACCEPT</span> settleHoldInvoice → sats arrive in the provider&apos;s wallet</li>
              <li><span>✕ DECLINE</span> cancelHoldInvoice → client keeps their sats</li>
              <li><span>◷ {ACCEPT_WINDOW_MINUTES} MIN</span> no answer → auto-cancel, every time</li>
            </ul>
          </div>
        </div>
        <div className="giant-wrap"><p className="giant giant--outline" data-giant="8" data-giant-chars><SplitChars text="Not sent." /></p></div>
      </section>

      {/* SHOW-UP RECORD */}
      <section className="record-sec section--light">
        <p className="label mono"><Scramble text="// 005 · The show-up record" /></p>
        <div className="record-sec__grid">
          <div>
            <RevealLines as="h2" className="display" lines={["Trust you", "can read."]} />
            <p className="scrub-p"><SplitWords>{"Every booking page carries a public record built from signed Nostr events. Clients see it before they pay. Providers see a client's past bookings before they accept."}</SplitWords></p>
            <div className="record-card accent-bar">
              <p className="mono">{rec ? `${demo?.displayName} · live from the demo` : "Example record · live data loads once the demo is set up"}</p>
              <p className="record-card__stats">
                <span>✓ {rec?.completed ?? "—"} completed</span><span>↩ {rec?.refunded ?? "—"} refunded</span>
                <span>⚠ {rec?.unresolved ?? "—"} unresolved no-show</span><span>⚖ {rec?.disputed ?? "—"} disputed</span>
              </p>
              <p className="mono record-card__note">Records are signed by {APP_NAME}. They show what each side reported, not a court ruling.</p>
              <a className="hl-link" href="/b/demo-braids">Open the record ▶▶</a>
            </div>
          </div>
          <div className="record-sec__photos">
            <div className="photo rec--lg" data-speed="-5"><img src="/img/portrait-turn-sm.webp" alt="A woman looking back over her shoulder" loading="lazy" /></div>
            <div className="photo rec--sm" data-speed="10"><img src="/img/kite-sm.webp" alt="Two silhouettes flying a kite at sunset" loading="lazy" /></div>
          </div>
        </div>
      </section>

      <Marquee className="marquee--dark marquee--reverse" items={["ShowUpSats can't spend your money", "Receive-only connection", "Refunds capped by your budget", "No names · No phone numbers"]} />

      {/* SECURITY */}
      <section id="security" className="security section--dark">
        <p className="label mono"><Scramble text="// 006 · Security" /></p>
        <div className="security__grid">
          <div className="photo security__photo"><img src="/img/mask-sm.webp" srcSet="/img/mask-sm.webp 700w, /img/mask.webp 1400w" sizes="(min-width: 900px) 40vw, 100vw" alt="A hooded figure lowering a white mask" loading="lazy" /></div>
          <div>
            <RevealLines as="h2" className="display" lines={[APP_NAME, <span key="c" className="hl">can&apos;t spend</span>, "your money."]} />
            <ul className="security__list">
              <li><b className="mono">CONNECTION A</b> Receive and hold only. We reject any connection that could spend.</li>
              <li><b className="mono">CONNECTION B</b> Refunds only, capped by a daily budget you set in your own wallet, and paid only to the client&apos;s address from booking time.</li>
              <li><b className="mono">AT REST</b> Wallet connections and preimages are encrypted with AES-256-GCM, and never sent to a browser.</li>
              <li><b className="mono">NO PII</b> No names, no phone numbers. Records use a salted hash.</li>
              <li><b className="mono">NOT ESCROW</b> We never hold funds. Holds last only for the accept window.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta section--lime">
        <p className="label mono"><Scramble text="// 007 · Start" /></p>
        <h2 className="giant cta__giant" data-giant="-4" data-giant-chars><SplitChars text="Show up." /></h2>
        <p className="lede">Your booking link in five minutes. Your wallet, your sats, your rules.</p>
        <a className="btn" href="/onboard">Create your booking link ▶▶</a>
        <div className="cta__strip" aria-hidden>
          {[["city", "tall", "6"], ["roots", "wide", "-8"], ["rose", "small", "12"], ["butterfly", "mid", "-4"]].map(([n, size, speed]) => (
            <div key={n} className={`photo strip--${size}`} data-speed={speed}><img src={`/img/${n}-sm.webp`} alt="" loading="lazy" /></div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer section--lime">
        <div className="ticks" aria-hidden />
        <p className="giant footer__giant footer__giant--wave"><SplitChars text={APP_WORDMARK} step={60} /></p>
        <div className="footer__row mono">
          <span>© 2026 {APP_NAME} · Dakar Bitcoin Hack</span>
          <span>TEST WALLETS · NOT REAL MONEY</span>
          <a href="https://github.com/eric-65/showupsats">Source</a>
        </div>
      </footer>
    </div>
  );
}
