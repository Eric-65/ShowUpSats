import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { currentMember, publicName } from "@/lib/server/members";
import { origin } from "@/lib/server/request";
import { CommunityHeader } from "@/components/community/SiteHeader";
import { Avatar } from "@/components/community/Avatar";
import { InviteShare } from "@/components/community/InviteShare";
import { VisibilityToggle } from "@/components/community/VisibilityToggle";
import { APP_NAME } from "@/lib/config";
import { featuredHref } from "@/lib/server/featured";
import "../community.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `My account · ${APP_NAME}`, robots: { index: false } };

export default async function MePage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const me = await currentMember();
  if (!me) redirect("/join");
  const { welcome } = await searchParams;
  const bookHref = await featuredHref();
  const base = process.env.APP_URL?.replace(/\/$/, "") || (await origin());
  const [refs, rank] = await Promise.all([
    db.member.findMany({ where: { referredById: me.id }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, name: true, avatarUrl: true, showInCommunity: true, createdAt: true } }),
    db.member.count(),
  ]);
  return (
    <>
      <CommunityHeader />
      <main className="cm section--dark">
        {welcome && <p className="me__welcome">✓ Welcome to {APP_NAME}! You&apos;re member #{rank}. Share your invite link below.</p>}
        <div className="me__head">
          <Avatar src={me.avatarUrl} name={me.name} size={64} />
          <div>
            <p className="label mono label--glow">// My account</p>
            <h1 className="display" style={{ margin: 0 }}>{publicName(me.name)}</h1>
          </div>
        </div>

        <section className="stats" aria-label="Your invites">
          <div className="stat"><div className="stat__n">{refs.length}</div><div className="stat__l">Friends you invited</div></div>
          <div className="stat"><div className="stat__n">{me.inviteClicks}</div><div className="stat__l">Invite link opens</div></div>
          <div className="stat"><div className="stat__n">{me.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div><div className="stat__l">Member since</div></div>
        </section>

        <p className="label mono">Your invite link</p>
        <p className="cm__lede" style={{ marginTop: 0 }}>Anyone who joins through this link is counted as your invite.</p>
        <InviteShare link={`${base}/i/${me.refCode}`} />

        <p className="label mono">People you invited</p>
        {refs.length === 0 ? <p className="empty">No one yet. Share your link on WhatsApp to get your first invite.</p> : (
          <ul className="refs">
            {refs.map((r) => (
              <li key={r.id}>
                <Avatar src={r.showInCommunity ? r.avatarUrl : null} name={r.showInCommunity ? r.name : "M"} size={36} />
                <span className="wall__name">{r.showInCommunity ? publicName(r.name) : "A new member"}</span>
                <span className="wall__meta" style={{ marginLeft: "auto" }}>joined {r.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
              </li>
            ))}
          </ul>
        )}

        <VisibilityToggle initial={me.showInCommunity} />

        <div className="cta-row">
          <a className="btn btn--outline" href="/community">View the community</a>
          <a className="btn btn--outline" href={bookHref}>Try a booking page</a>
          <form action="/api/auth/member/logout" method="post"><button className="btn btn--outline">Sign out</button></form>
        </div>
      </main>
    </>
  );
}
