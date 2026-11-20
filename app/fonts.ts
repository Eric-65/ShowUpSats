import localFont from "next/font/local";
/* Self-hosted fonts (OFL-licensed, see app/fonts/LICENSE-*): no network fetch at build time. */
export const display = localFont({
  src: [
    { path: "./fonts/inter-tight-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter-tight-latin-800-normal.woff2", weight: "800", style: "normal" },
    { path: "./fonts/inter-tight-latin-900-normal.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-display", display: "swap", fallback: ["Arial", "system-ui", "sans-serif"],
});
export const mono = localFont({
  src: [
    { path: "./fonts/jetbrains-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/jetbrains-mono-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-mono", display: "swap", fallback: ["ui-monospace", "monospace"],
});
