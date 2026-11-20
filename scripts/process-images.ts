/** Bake the "dark editorial" treatment into every photo: greyscale, crushed blacks, high contrast,
 *  vignette and film grain. Outputs small WebP files (good for 3G). Usage: tsx scripts/process-images.ts <srcDir> */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const MAP: Record<string, string> = {
  "eee71c47": "portrait-suit", "a02ed33b": "portrait-turn", "52aadc11": "city", "f5b5feaf": "rose",
  "e2883fcd": "kite", "1ed731ac": "coin", "b63e6949": "eyes", "f1b0e02c": "mask", "8e78ef11": "butterfly",
  "f0154847": "laugh", "0bdc8bc8": "veil", "4542ecb9": "hands", "392353c0": "roots",
};
const src = process.argv[2];
const out = "public/img";

function vignette(w: number, h: number) {
  return Buffer.from(`<svg width="${w}" height="${h}"><defs><radialGradient id="v" cx="50%" cy="45%" r="75%">
    <stop offset="45%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.85"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#v)"/></svg>`);
}
async function grain(w: number, h: number) {
  const px = Buffer.alloc(w * h);
  for (let i = 0; i < px.length; i++) px[i] = 128 + Math.round((Math.random() - 0.5) * 34);
  return sharp(px, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();
}

(async () => {
  for (const f of fs.readdirSync(src)) {
    const key = Object.keys(MAP).find((k) => f.startsWith(k));
    if (!key) continue;
    for (const width of [1400, 700]) {
      const base = sharp(path.join(src, f)).rotate().resize({ width, withoutEnlargement: true }).greyscale()
        .linear(1.35, -40)   // contrast, crush blacks
        .gamma(1.6);          // pull midtones down
      const { data, info } = await base.png().toBuffer({ resolveWithObject: true });
      const g = await grain(info.width, info.height);
      await sharp(data)
        .composite([{ input: vignette(info.width, info.height) }, { input: g, blend: "overlay" }])
        .greyscale()
        .webp({ quality: width > 1000 ? 55 : 50 })
        .toFile(path.join(out, `${MAP[key]}${width === 700 ? "-sm" : ""}.webp`));
    }
    console.log("✓", MAP[key]);
  }
})();
