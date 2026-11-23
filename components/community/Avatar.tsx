/* eslint-disable @next/next/no-img-element */
export function Avatar({ src, name, size = 48 }: { src: string | null; name: string; size?: number }) {
  const initial = name.trim()[0]?.toUpperCase() ?? "•";
  return src
    ? <img className="avatar" src={src} alt="" width={size} height={size} referrerPolicy="no-referrer" loading="lazy" />
    : <span className="avatar avatar--ph" style={{ width: size, height: size }} aria-hidden>{initial}</span>;
}
