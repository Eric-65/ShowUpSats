import { cookies } from "next/headers";
import { getDict, type Lang } from "./i18n";
export async function serverLang(fallback?: string): Promise<{ lang: Lang; d: ReturnType<typeof getDict> }> {
  const c = (await cookies()).get("lang")?.value;
  const lang: Lang = c === "fr" || c === "en" ? c : fallback === "fr" ? "fr" : "en";
  return { lang, d: getDict(lang) };
}
