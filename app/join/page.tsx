import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { currentMember, isRefCode, publicName } from "@/lib/server/members";
import { googleConfigured } from "@/lib/server/google";
import { CommunityHeader } from "@/components/community/SiteHeader";
import { Avatar } from "@/components/community/Avatar";
import { APP_NAME } from "@/lib/config";
import "../community.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Join · ${APP_NAME}` };

const ERRORS: Record<string, string> = {
  not_configured: "Google sign-in isn't switched on yet. The site owner needs to add the Google keys.",
  cancelled: "Sign-in was cancelled. Try again whenever you're ready.",
  expired: "That sign-in took too long. Please try again.",
  state: "Something didn't match during sign-in. Please try again.",
  token: "Google didn't confirm the sign-in. Please try again.",
  unverified: "Please use a Google account with a verified email.",
  rate_limited: "Too many attempts. Wait a few minutes and try again.",
};

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ ref?: string; error?: string }> }) {
  if (await currentMember()) redirect("/me");
  const { ref, error } = await searchParams;
  const inviter = isRefCode(ref) ? await db.member.findUnique({ where: { refCode: ref }, select: { name: true, avatarUrl: true, showInCommunity: true } }).catch(() => null) : null;
  const total = await db.member.count().catch(() => 0);
  const ready = googleConfigured();
  return (
    <>
      <CommunityHeader />
      <main className="cm section--dark">
        <p className="label mono label--glow">// Join</p>
        <h1 className="display cm__title">Join<br /><span className="hl">{APP_NAME}.</span></h1>
        {inviter && (
          <div className="inviter">
            <Avatar src={inviter.showInCommunity ? inviter.avatarUrl : null} name={inviter.showInCommunity ? publicName(inviter.name) : "A"} />
            <p><b>{inviter.showInCommunity ? publicName(inviter.name) : "A member"}</b> invited you.</p>
          </div>
        )}
        <p className="cm__lede">Sign in with Google to join {total > 0 ? `${total} ${total === 1 ? "member" : "members"}` : "the first members"} trying booking deposits that are locked, not sent. You get your own invite link to share.</p>
        {error && <p className="error" role="alert">{ERRORS[error] ?? "Sign-in didn't work. Please try again."}</p>}
        <div className="cta-row">
          {ready
            ? <a className="gbtn" href="/api/auth/google/start">
                <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.8 6C12.3 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C1 16.5 0 20.1 0 24s1 7.5 2.6 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.8l-7.8 6C6.6 42.6 14.6 48 24 48z"/></svg>
                Continue with Google
              </a>
            : <p className="empty">Google sign-in is being set up. Check back soon.</p>}
          <a className="btn btn--outline" href="/community">See the community</a>
        </div>
        <p className="wall__meta">We only get your name, email and photo from Google. Your email is never shown. You choose if your name and photo appear in the community.</p>
      </main>
    </>
  );
}
