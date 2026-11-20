const TZ = process.env.NEXT_PUBLIC_DISPLAY_TZ || "Africa/Lagos";
export function fiat(amount: number, currency: string, lang = "en") {
  try { return new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount); }
  catch { return `${amount} ${currency}`; }
}
export const sats = (n: number) => `${n.toLocaleString("en-US")} sats`;
export function when(iso: string | Date, lang = "en") {
  return new Date(iso).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
export function day(iso: string | Date, lang = "en") {
  return new Date(iso).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
}
export function time(iso: string | Date, lang = "en") {
  return new Date(iso).toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}
