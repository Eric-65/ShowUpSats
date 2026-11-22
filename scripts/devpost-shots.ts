/** Generates 3:2 Devpost gallery images from the running app (real test-wallet booking). */
import { config } from "dotenv"; config({ path: ".env.local.wallets" });
import "../lib/server/ws-polyfill";
import { chromium, type Page } from "playwright";
import { NWCClient } from "@getalby/sdk/nwc";
import sharp from "sharp";
const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT!;
const lud16 = new URL(process.env.NWC_CLIENT_URI!.replace("nostr+walletconnect://", "http://x/")).searchParams.get("lud16")!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const phone: Record<string, Buffer> = {};
const snapPhone = async (p: Page, k: string) => { phone[k] = await p.screenshot(); };

async function scrollTo(p: Page, sel: string, offset = 0) {
  const y = await p.evaluate(([s, o]) => document.querySelector(s as string)!.getBoundingClientRect().top + scrollY + (o as number), [sel, offset]);
  for (let cur = 0; cur < y; cur += 500) { await p.mouse.wheel(0, Math.min(500, y - cur)); await sleep(90); }
  await sleep(1600);
}

async function composite(name: string, keys: string[], title: string, sub: string) {
  const W = 3000, H = 2000, ph = 1560, pw = Math.round(ph * 390 / 844);
  const gap = 90, total = keys.length * pw + (keys.length - 1) * gap, x0 = (W - total) / 2;
  const layers = await Promise.all(keys.map(async (k, i) => ({
    input: await sharp(phone[k]).resize(pw, ph).extend({ top: 6, bottom: 6, left: 6, right: 6, background: "#2E2E2E" }).toBuffer(),
    left: Math.round(x0 + i * (pw + gap)) - 6, top: 330,
  })));
  const svg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#0A0A0B"/>
    <text x="${W / 2}" y="170" text-anchor="middle" font-family="Inter Tight, Arial Black, sans-serif" font-weight="900" font-size="104" fill="#F2F2F0" letter-spacing="-3">${title}</text>
    <text x="${W / 2}" y="250" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="38" fill="#80FF28" letter-spacing="4">${sub}</text>
    <rect x="0" y="${H - 14}" width="${W}" height="14" fill="#80FF28"/></svg>`);
  await sharp(svg).composite(layers).jpeg({ quality: 88 }).toFile(`${OUT}/${name}.jpg`);
}

(async () => {
  const cli = new NWCClient({ nostrWalletConnectUrl: process.env.NWC_CLIENT_URI! });
  const b = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
  // desktop landing shots (3:2)
  const d = await b.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
  await d.goto(`${BASE}/`, { waitUntil: "networkidle" }); await sleep(3500);
  await d.screenshot({ path: `${OUT}/01-landing-hero.jpg`, type: "jpeg", quality: 88 });
  // section shots: reduced motion = no Lenis/pinning, so scroll positions are exact
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  const r = await ctx.newPage();
  await r.goto(`${BASE}/`, { waitUntil: "networkidle" });
  for (const [sel, file] of [[".locked", "05-locked-not-sent"], ["#security", "07-security"], [".record-sec", "09-show-up-record"]]) {
    await r.evaluate((s) => { const el = document.querySelector(s)!; window.scrollTo(0, el.getBoundingClientRect().top + scrollY + 40); }, sel);
    await sleep(1500);
    await r.screenshot({ path: `${OUT}/${file}.jpg`, type: "jpeg", quality: 88 });
  }
  // client on phone
  const c = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await c.goto(`${BASE}/b/demo-braids`, { waitUntil: "networkidle" }); await sleep(1500);
  await snapPhone(c, "book");
  await c.locator('input[name="service"]').nth(1).check();
  await c.locator('input[name="slot"]').first().check();
  await c.fill('input[type="email"]', lud16);
  await c.check(".agree input");
  await c.locator(".book-form__policy").scrollIntoViewIfNeeded(); await sleep(400);
  await snapPhone(c, "form");
  await c.click("button.btn--block");
  await c.waitForSelector('a[href^="lightning:"]', { timeout: 30000 }); await sleep(3500);
  await c.evaluate(() => scrollTo(0, 0)); await sleep(300);
  await snapPhone(c, "pay");
  const inv = (await c.getAttribute('a[href^="lightning:"]', "href"))!.slice(10);
  cli.payInvoice({ invoice: inv }).catch(() => {});
  await c.waitForFunction(() => /waiting for .* to accept/i.test(document.body.innerText), null, { timeout: 30000 }); await sleep(1500);
  await snapPhone(c, "held");
  // provider dashboard (desktop + phone)
  const pd = await b.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2, extraHTTPHeaders: { "x-forwarded-host": "show-up-sats.vercel.app", "x-forwarded-proto": "https" } });
  await pd.goto(`${BASE}/login`);
  await pd.fill('input[autocomplete="username"]', "demo-braids");
  await pd.fill('input[type="password"]', "demo-braids-dashboard-key-0001");
  await pd.click("button.btn--lime"); await pd.waitForURL(/dashboard/); await sleep(1500);
  await pd.evaluate(() => scrollTo(0, 0)); await sleep(600);
  await pd.screenshot({ path: `${OUT}/04-dashboard-accept.jpg`, type: "jpeg", quality: 88 });
  await pd.click(".dash__row--held button.btn--lime");
  await pd.waitForSelector(".dash__row--accepted", { timeout: 30000 });
  // client sees accepted → receipt
  await c.waitForSelector(".pay__done", { timeout: 20000 }); await sleep(1200);
  await snapPhone(c, "accepted");
  await c.click(".pay__done a"); await c.waitForSelector(".verify--ok", { timeout: 20000 }); await sleep(1500);
  await snapPhone(c, "receipt-code");
  await c.locator(".verify").scrollIntoViewIfNeeded(); await c.evaluate(() => scrollBy(0, 220)); await sleep(1000);
  await snapPhone(c, "receipt-verified");
  const code = (await c.textContent(".checkin__code"))!.replace(/\s/g, "");
  await pd.reload(); await sleep(1200);
  await pd.fill('.dash__row--accepted input[inputmode="numeric"]', code);
  await pd.click(".dash__row--accepted .checkin-form button");
  await pd.waitForSelector(".dash__row--checked_in", { timeout: 15000 }); await sleep(1000);
  await pd.evaluate(() => scrollTo(0, 0)); await sleep(600);
  await pd.screenshot({ path: `${OUT}/08-dashboard-checked-in.jpg`, type: "jpeg", quality: 88 });

  await composite("02-booking-flow", ["book", "form", "pay"], "BOOK. AGREE. LOCK THE DEPOSIT.", "// BOOKING PAGE ON A PHONE · 106 KB JS · LIGHTHOUSE 98");
  await composite("03-locked-then-accepted", ["held", "accepted", "receipt-code"], "LOCKED, NOT SENT → ACCEPTED", "// HOLD INVOICE SETTLES ONLY WHEN THE PROVIDER TAPS ACCEPT");
  await composite("06-verified-receipt", ["receipt-code", "receipt-verified"], "SIGNED RECEIPT + CHECK-IN CODE", "// NOSTR SIGNATURE VERIFIED IN THE BROWSER · POLICY HASH MATCHES");
  await b.close(); cli.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
