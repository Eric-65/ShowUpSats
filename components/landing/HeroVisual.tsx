"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { StaticLock } from "./StaticLock";

const Hero3D = dynamic(() => import("./Hero3D"), { ssr: false, loading: () => <StaticLock /> });

/** 3D only when the device can afford it; otherwise a static SVG lock. */
function can3D() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string }; deviceMemory?: number };
  if (nav.connection?.saveData) return false;
  if (["slow-2g", "2g", "3g"].includes(nav.connection?.effectiveType ?? "")) return false;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2) return false;
  try { const c = document.createElement("canvas"); if (!(c.getContext("webgl2") || c.getContext("webgl"))) return false; } catch { return false; }
  return true;
}

export function HeroVisual() {
  const [ok, setOk] = useState(false);
  useEffect(() => { setOk(can3D()); }, []);
  return <div className="hero__visual">{ok ? <Hero3D /> : <StaticLock />}</div>;
}
