import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/server/db";
import { providerRecord } from "@/lib/server/records";
import { sweepExpired } from "@/lib/server/bookings";
import { serverLang } from "@/lib/lang";
import { ShowUpRecord } from "@/components/ShowUpRecord";
import { LangToggle } from "@/components/LangToggle";
import { BookingFlow } from "./BookingFlow";
import { APP_WORDMARK, ACCEPT_WINDOW_MINUTES, DEMO_MODE } from "@/lib/config";
import { fiat, day, time } from "@/lib/format";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await db.provider.findUnique({ where: { slug: (await params).slug }, select: { displayName: true } });
  return { title: p ? `Book ${p.displayName}` : "Booking link" };
}

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const provider = await db.provider.findUnique({ where: { slug }, include: { services: true } });
  if (!provider) notFound();
  await sweepExpired(provider.id).catch(() => 0);
  const { lang, d } = await serverLang(provider.language);
  const [record, slots] = await Promise.all([
    providerRecord(provider.id),
    db.slot.findMany({ where: { providerId: provider.id, status: "open", startsAt: { gt: new Date(Date.now() + 10 * 60_000) } }, orderBy: { startsAt: "asc" }, take: 30 }),
  ]);
  const services = provider.services.map((s) => ({ id: s.id, name: s.name, durationMin: s.durationMin, price: fiat(s.priceFiat, provider.currency, lang), deposit: fiat(s.depositFiat, provider.currency, lang) }));
  const slotList = slots.map((s) => ({ id: s.id, day: day(s.startsAt, lang), time: time(s.startsAt, lang) }));

  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="/">{APP_WORDMARK}</a>
        <LangToggle lang={lang} label={d.langToggle} />
      </header>
      <main className="booking">
        <section className="booking__hero section--dark">
          <p className="label mono">// {provider.slug}</p>
          <h1 className="booking__name display">{provider.displayName}</h1>
          <ShowUpRecord r={record} d={d} lang={lang} />
        </section>
        {!provider.nwcReceiveEnc && !DEMO_MODE ? (
          <p className="notice">{t(d.bookingsClosed, { name: provider.displayName })}</p>
        ) : (
          <BookingFlow
            slug={provider.slug} providerName={provider.displayName} services={services} slots={slotList}
            policyText={provider.policyText} policyHash={provider.policyHash} windowMin={ACCEPT_WINDOW_MINUTES}
            demo={DEMO_MODE} d={d}
          />
        )}
      </main>
    </>
  );
}
