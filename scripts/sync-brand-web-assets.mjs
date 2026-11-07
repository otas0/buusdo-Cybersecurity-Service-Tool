/**
 * Build transparent dark-field brand assets for web UI from light-plate sources.
 * Default outputs sit on --bg without a white CSS plate.
 *
 * Usage: node scripts/sync-brand-web-assets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "shared/brand/source");
const targets = [
  "public/brand",
  "shared/brand",
  "china-pages/assets",
  "extension/icons",
  "desktop-app/public/brand",
];

async function toDarkTransparent(pngBuf) {
  const { data, info } = await sharp(pngBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0, j = 0; i < data.length; i += c, j += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum >= 235) {
      out[j] = out[j + 1] = out[j + 2] = out[j + 3] = 0;
      continue;
    }
    const ir = 255 - r;
    const ig = 255 - g;
    const ib = 255 - b;
    out[j] = Math.round(ir * (243 / 255));
    out[j + 1] = Math.round(ig * (241 / 255));
    out[j + 2] = Math.round(ib * (234 / 255));
    out[j + 3] = Math.round(Math.min(255, ((255 - lum) / 255) * 255 * 1.05));
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

async function toLightTransparent(pngBuf) {
  const { data, info } = await sharp(pngBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0, j = 0; i < data.length; i += c, j += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum >= 235) {
      out[j] = out[j + 1] = out[j + 2] = out[j + 3] = 0;
      continue;
    }
    out[j] = r;
    out[j + 1] = g;
    out[j + 2] = b;
    out[j + 3] = Math.round(Math.min(255, ((255 - lum) / 255) * 255 * 1.05));
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

function svgWrap(pngBuf, w, h, label) {
  const b64 = pngBuf.toString("base64");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">
  <title>${label}</title>
  <image width="${w}" height="${h}" href="data:image/png;base64,${b64}" preserveAspectRatio="xMidYMid meet"/>
</svg>
`;
}

const markDark = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="buusdo">
  <title>buusdo</title>
  <polygon fill="#f3f1ea" points="4,15.59 37.25,16.36 59.89,59.13 4,57.59"/>
  <polygon fill="#8d897f" points="4,15.48 59.89,10.78 59.89,59.34 4,57.92"/>
</svg>
`;

const wordSrc = fs.readFileSync(
  path.join(sourceDir, "buusdo-wordmark-light-plate.png"),
);
const logoSrc = fs.readFileSync(
  path.join(sourceDir, "buusdo-logo-light-plate.png"),
);

const wordDark = await toDarkTransparent(wordSrc);
const wordLight = await toLightTransparent(wordSrc);
const logoDark = await toDarkTransparent(logoSrc);
const logoLight = await toLightTransparent(logoSrc);
const wordMeta = await sharp(wordDark).metadata();
const logoMeta = await sharp(logoDark).metadata();
const label = "buusdo Cybersecurity Service Tool";

for (const rel of targets) {
  const dir = path.join(root, rel);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "buusdo-wordmark.png"), wordDark);
  fs.writeFileSync(
    path.join(dir, "buusdo-wordmark.svg"),
    svgWrap(wordDark, wordMeta.width, wordMeta.height, label),
  );
  fs.writeFileSync(path.join(dir, "buusdo-logo.png"), logoDark);
  fs.writeFileSync(
    path.join(dir, "buusdo-logo.svg"),
    svgWrap(logoDark, logoMeta.width, logoMeta.height, label),
  );
  fs.writeFileSync(path.join(dir, "buusdo-wordmark-on-light.png"), wordLight);
  fs.writeFileSync(path.join(dir, "buusdo-logo-on-light.png"), logoLight);
  fs.writeFileSync(path.join(dir, "buusdo-mark.svg"), markDark);
}

console.log(
  `Synced transparent dark-field brand assets → ${targets.join(", ")}`,
);
