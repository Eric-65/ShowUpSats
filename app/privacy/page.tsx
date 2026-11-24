import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = { title: `Privacy policy · ${APP_NAME}` };
const CONTACT = "https://github.com/eric-65/showupsats/issues";

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="24 November 2026">
      <p>{APP_NAME} (“we”) runs booking links where Lightning deposits are locked, not sent. This page explains what we collect, why, and your choices. In short: <b>we collect very little, we never sell it, and we never hold your money.</b></p>

      <h2>What we collect</h2>
      <ul>
        <li><b>If you sign in with Google:</b> your Google account ID, name, email address and profile photo. We use these to create your account and invite link. <b>Your email is never shown publicly.</b></li>
        <li><b>Community profile:</b> you are hidden by default. Only if you switch on “Show me in the community” do we show your first name, last initial and Google photo on the community page.</li>
        <li><b>Invites:</b> who invited you (if you joined through an invite link) and how many times your own invite link was opened.</li>
        <li><b>If you book an appointment:</b> the Lightning address you enter (so refunds can be sent), the service and time you picked, and payment details of the deposit (amount and payment hash). We do <b>not</b> ask for your name or phone number to book.</li>
        <li><b>If you are a provider:</b> your business name, services, prices, cancellation policy and the wallet connections you paste. Wallet connections are encrypted (AES-256-GCM) and never shown to anyone.</li>
        <li><b>Technical data:</b> a hashed version of your IP address for rate-limiting and abuse prevention, and essential cookies (below).</li>
      </ul>

      <h2>Cookies</h2>
      <p>We only use essential cookies: one to keep you signed in, one to remember an invite link for up to 30 days, a short-lived one during Google sign-in, and one for your language choice. No advertising or tracking cookies.</p>

      <h2>How we use it</h2>
      <ul>
        <li>To run bookings, deposits, refunds, receipts and check-in codes.</li>
        <li>To show your invite count and, if you choose, your community profile.</li>
        <li>To show public totals (member count and growth). These numbers contain no personal details.</li>
        <li>To keep the service secure and prevent abuse.</li>
      </ul>

      <h2>What is public</h2>
      <p>Receipts and show-up records are signed and may be published to public Nostr relays. They contain booking IDs, amounts, the service name, times and outcomes: <b>never your name, email, phone number or Lightning address.</b></p>

      <h2>Sharing</h2>
      <p>We don't sell or rent your data. We use these service providers to run the app: Vercel (hosting), Neon (database), Google (sign-in), Lightning wallets you connect through Nostr Wallet Connect, and public Nostr relays (signed receipts). Payments go directly between wallets; {APP_NAME} never holds funds.</p>

      <h2>Your choices</h2>
      <ul>
        <li>Turn your community profile on or off at any time on your account page.</li>
        <li>Sign out at any time. You can also remove {APP_NAME}'s access in your Google Account settings (Security → Third-party connections).</li>
        <li>To have your account and data deleted, open a request at <a href={CONTACT} target="_blank" rel="noopener noreferrer">our GitHub issues page</a> (don't post personal details there; we'll reply to arrange it).</li>
      </ul>

      <h2>Test service</h2>
      <p>{APP_NAME} is currently a demo running on test Lightning wallets. No real money is involved.</p>

      <h2>Contact</h2>
      <p>Questions about this policy: <a href={CONTACT} target="_blank" rel="noopener noreferrer">github.com/eric-65/showupsats/issues</a>.</p>
    </LegalPage>
  );
}
