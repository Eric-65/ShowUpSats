import { notFound } from "next/navigation";
import { db } from "@/lib/server/db";
import { decrypt, policyHash as hashPolicy, safeEqualHex, sha256Hex } from "@/lib/server/crypto";
import { refreshStatus } from "@/lib/server/bookings";
import { serverLang } from "@/lib/lang";
import { StatusChip } from "@/components/StatusChip";
import { LangToggle } from "@/components/LangToggle";
import { ReceiptVerify } from "./ReceiptVerify";
import { ClientActions } from "./ClientActions";
import { APP_WORDMARK, NO_SHOW_GRACE_MINUTES, STYLIST_REFUND_DEADLINE_HOURS } from "@/lib/config";
import { fiat, when } from "@/lib/format";
import { t } from "@/lib/i18n";
import { origin } from "@/lib/server/request";

export const dynamic = "force-dynamic";
export const metadata = { title: "Receipt", robots: { index: false } };

export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  const token = (await searchParams).t;
  if (!/^[a-z0-9]{5,40}$/i.test(id)) notFound();
  const exists = await db.booking.findUnique({ where: { id }, select: { id: true } });
  if (!exists) notFound();
  await refreshStatus(id).catch(() => null);
  const b = await db.booking.findUniqueOrThrow({ where: { id }, include: { provider: true, service: true, slot: true } });
  const { lang, d } = await serverLang(b.provider.language);
  const isClient = !!token && /^[0-9a-f]{32}$/.test(token) && safeEqualHex(sha256Hex(b.clientToken), sha256Hex(token));
  const event = b.receiptEventJson ? JSON.parse(b.receiptEventJson) : null;
  const signed = event ? JSON.parse(event.content) : null;
  const policyOk = signed ? hashPolicy(b.provider.policyText) === signed.policyHash : null;
  const code = isClient && b.status === "accepted" && b.checkInCodeEnc ? decrypt(b.checkInCodeEnc) : null;
  const graceOver = Date.now() > b.slot.startsAt.getTime() + NO_SHOW_GRACE_MINUTES * 60_000;
  const early = Date.now() <= b.slot.startsAt.getTime() - b.provider.cancelNoticeHours * 3600_000;
  const shareText = `${d.receipt} · ${b.provider.displayName} · ${when(b.slot.startsAt, lang)} — ${await origin()}/r/${b.id}`;

  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="/">{APP_WORDMARK}</a>
        <LangToggle lang={lang} label={d.langToggle} />
      </header>
      <main className="receipt section--light">
        <p className="label mono">// {d.receipt} · {b.id}</p>
        <h1 className="display">{b.provider.displayName}</h1>
        <StatusChip status={b.status} lang={lang} />

        {code && (
          <section className="checkin section--dark">
            <p className="label mono">{d.checkInCode}</p>
            <p className="checkin__code mono" aria-label={code.split("").join(" ")}>{code.slice(0, 3)} {code.slice(3)}</p>
            <p>{t(d.showCode, { name: b.provider.displayName })}</p>
          </section>
        )}

        <dl className="archive accent-bar">
          <dt className="mono">{d.service}</dt><dd>{b.service.name}</dd>
          <dt className="mono">{d.when}</dt><dd>{when(b.slot.startsAt, lang)}</dd>
          <dt className="mono">{d.deposit}</dt><dd>{fiat(b.depositFiat, b.provider.currency, lang)} · <span className="mono">{b.depositSats.toLocaleString()} sats</span></dd>
          <dt className="mono">{d.paymentHash}</dt><dd className="mono hash">{b.paymentHash}</dd>
          <dt className="mono">{d.policyHash}</dt><dd className="mono hash">{b.provider.policyHash}</dd>
          {b.acceptedAt && <><dt className="mono">{d.acceptedAt}</dt><dd>{when(b.acceptedAt, lang)}</dd></>}
        </dl>

        {event ? <ReceiptVerify event={event} d={d} /> : <p className="mono">{d.verifying}</p>}
        {policyOk !== null && <p className={policyOk ? "ok" : "error"}>{policyOk ? d.policyMatches : d.policyMismatch}</p>}

        <section className="policy-block">
          <h2 className="label mono">{d.policyTitle}</h2>
          <blockquote className="policy accent-bar"><pre className="policy__text">{b.provider.policyText}</pre></blockquote>
        </section>

        <p>
          <a className="btn btn--outline" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">
            {d.shareWhatsApp}
          </a>
        </p>

        {isClient && (
          <ClientActions id={b.id} token={token!} status={b.status} early={early} graceOver={graceOver}
            providerName={b.provider.displayName} noticeHours={b.provider.cancelNoticeHours} refundHours={STYLIST_REFUND_DEADLINE_HOURS} d={d} />
        )}
      </main>
    </>
  );
}
