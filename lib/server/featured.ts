import { db } from "./db";
import { FALLBACK_SLUG, FEATURED_SLUG } from "../config";

/** The featured booking page, falling back to the seeded demo if the featured one doesn't exist. */
export async function featuredProvider() {
  for (const slug of [FEATURED_SLUG, FALLBACK_SLUG]) {
    const p = await db.provider.findUnique({ where: { slug }, select: { id: true, slug: true, displayName: true } }).catch(() => null);
    if (p) return p;
  }
  return null;
}
export async function featuredHref() {
  const p = await featuredProvider();
  return `/b/${p?.slug ?? FEATURED_SLUG}`;
}
