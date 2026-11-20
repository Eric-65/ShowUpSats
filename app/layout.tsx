import type { Metadata, Viewport } from "next";
import "./theme.css";
import { APP_NAME, DEMO_MODE } from "@/lib/config";
import { serverLang } from "@/lib/lang";
import { display, mono } from "./fonts";

export const metadata: Metadata = {
  title: `${APP_NAME} — deposits that are locked, not sent`,
  description: "Booking links with Lightning hold-invoice deposits for one-person service businesses.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0A0A0B" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, d } = await serverLang();
  return (
    <html lang={lang} className={`${display.variable} ${mono.variable}`}>
      <body>
        {DEMO_MODE ? <div className="banner banner--demo" role="status">{d.demoBanner}</div>
          : <div className="banner banner--test" role="status">{d.testBanner}</div>}
        {children}
      </body>
    </html>
  );
}
