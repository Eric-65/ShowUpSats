import type { Metadata } from "next";
import { communityStats, currentMember } from "@/lib/server/members";
import { CommunityHeader } from "@/components/community/SiteHeader";
import { Avatar } from "@/components/community/Avatar";
import { APP_NAME } from "@/lib/config";
import "../community.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Community · ${APP_NAME}`, description: "Real people joining ShowUpSats, growing every week." };

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default async function CommunityPage() {
  const [s, me] = await Promise.all([communityStats().catch(() => null), currentMember()]);
  const max = Math.max(1, ...(s?.days.map((d) => d.count) ?? [1]));
  return (
    <>
      <CommunityHeader />
      <main className="cm section--dark">
        <p className="label mono label--glow">// Community</p>
        <h1 className="display cm__title">Real people.<br /><span className="hl">Growing.</span></h1>
        <p className="cm__lede">Everyone here signed in with Google to try {APP_NAME}. Members choose whether their name and photo appear. Emails are never shown.</p>

        {!s ? <p className="empty">The community is loading. Try again in a moment.</p> : (
          <>
            <section className="stats" aria-label="Community stats">
              <div className="stat"><div className="stat__n">{s.total}</div><div className="stat__l">Members</div></div>
              <div className="stat"><div className="stat__n">+{s.week}</div><div className="stat__l">Joined this week</div></div>
              <div className="stat"><div className="stat__n">{s.viaInvite}</div><div className="stat__l">Joined via invite</div></div>
            </section>

            <section aria-label="New members per day, last 14 days">
              <p className="label mono">New members · last 14 days</p>
              <div className="growth" role="img" aria-label={s.days.map((d) => `${fmtDay(d.day)}: ${d.count}`).join(", ")}>
                {s.days.map((d, i) => (
                  <div key={d.day} className={`growth__bar ${d.count ? "" : "growth__bar--zero"}`} style={{ height: `${Math.max(2, (d.count / max) * 100)}%`, ["--i" as string]: i }} title={`${fmtDay(d.day)}: ${d.count}`} />
                ))}
              </div>
              <div className="growth__axis"><span>{fmtDay(s.days[0].day)}</span><span>Today</span></div>
            </section>

            <div className="cta-row">
              {me ? <a className="btn btn--lime" href="/me">Invite friends ▶▶</a> : <a className="btn btn--lime" href="/join">Join the community ▶▶</a>}
              <a className="btn btn--outline" href="/b/demo-braids">Try the demo booking</a>
            </div>

            <section aria-label="Top inviters">
              <p className="label mono">Top inviters</p>
              {s.top.length === 0 ? <p className="empty">No invites yet. Be the first: sign in and share your link.</p> : (
                <ol className="top">
                  {s.top.map((t) => (
                    <li key={t.id}><Avatar src={t.avatarUrl} name={t.name} size={36} /><span className="wall__name">{t.name}</span><span className="top__n">{t.referrals} invited</span></li>
                  ))}
                </ol>
              )}
            </section>

            <section aria-label="Members">
              <p className="label mono">Members who chose to be shown</p>
              {s.wall.length === 0 ? <p className="empty">No public profiles yet. Members can switch “Show me in the community” on their account page.</p> : (
                <ul className="wall">
                  {s.wall.map((m, i) => (
                    <li key={m.id} style={{ animationDelay: `${Math.min(i, 20) * 30}ms` }}>
                      <Avatar src={m.avatarUrl} name={m.name} />
                      <div><div className="wall__name">{m.name}</div><div className="wall__meta">Joined {fmtDay(m.joined)}{m.referrals ? ` · ${m.referrals} invited` : ""}</div></div>
                    </li>
                  ))}
                </ul>
              )}
              {s.total > s.wall.length && <p className="wall__meta">+ {s.total - s.wall.length} more {s.total - s.wall.length === 1 ? "member keeps" : "members keep"} their profile private.</p>}
            </section>
          </>
        )}
      </main>
    </>
  );
}
