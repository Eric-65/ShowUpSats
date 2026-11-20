import { redirect } from "next/navigation";
import { currentProviderId } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { dashboardData } from "@/lib/server/dashboard";
import { providerRecord } from "@/lib/server/records";
import { serverLang } from "@/lib/lang";
import { origin } from "@/lib/server/request";
import { Dashboard } from "./Dashboard";
import { ShowUpRecord } from "@/components/ShowUpRecord";
import { LangToggle } from "@/components/LangToggle";
import { APP_WORDMARK, ACCEPT_WINDOW_MINUTES } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard", robots: { index: false } };

export default async function DashboardPage() {
  const id = await currentProviderId();
  if (!id) redirect("/login");
  const p = await db.provider.findUnique({ where: { id } });
  if (!p) redirect("/login");
  const { lang, d } = await serverLang(p.language);
  const [bookings, record] = await Promise.all([dashboardData(p.id), providerRecord(p.id)]);
  const link = `${await origin()}/b/${p.slug}`;
  return (
    <div className="dash section--dark">
      <header className="site-header">
        <a className="wordmark" href="/">{APP_WORDMARK}</a>
        <LangToggle lang={lang} label={d.langToggle} />
        <form action="/api/auth/logout" method="post"><button className="btn btn--outline">{d.logout}</button></form>
      </header>
      <main>
        <p className="label mono">// {d.dashboard}</p>
        <h1 className="display">{p.displayName}</h1>
        <p className="mono">{d.yourLink}: <a href={link}>{link}</a></p>
        {(!p.nwcReceiveEnc || !p.nwcRefundEnc) && <p className="notice"><a href="/onboard?step=2">Connect your wallet to take bookings ▶▶</a></p>}
        <ShowUpRecord r={record} d={d} lang={lang} />
        <Dashboard initial={bookings} d={d} lang={lang} currency={p.currency} windowMin={ACCEPT_WINDOW_MINUTES} />
      </main>
    </div>
  );
}
