/**
 * Build transparent dark-field brand assets + chrome icons from light-plate sources.
 *
 * Usage: node scripts/sync-brand-web-assets.mjs
 *
 * Also rebuilds: favicon, apple-touch, extension icons, Safari AppIcon set,
 * desktop tray PNG/ICO, OG, store FRAME. Does not invent a fake path-wordmark —
 * wait for designer SVG under shared/brand/source/buusdo-wordmark-paths.svg.
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

const BG = "#0e0e0e";
const TEXT = "#f3f1ea";
const HALT = "#ff4d00";
const MUTED = "#8d897f";
const label = "buusdo Cybersecurity Service Tool";

/**
 * Wordmark u-card on light plates is charcoal #545454 — never Halt orange, never invert to cream.
 * REMOVE this heuristic when `shared/brand/source/buusdo-wordmark-paths.svg` ships
 * (vector fills carry charcoal/muted explicitly — see docs/BRAND_U_CARD.md).
 */
function isCharcoalUCard(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return max - min <= 18 && lum >= 55 && lum <= 120;
}

function parseHex(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const MUTED_RGB = parseHex(MUTED);
const TEXT_RGB = parseHex(TEXT);

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
    // Charcoal u-card → instrument MUTED on dark field (do not cream-invert).
    if (isCharcoalUCard(r, g, b)) {
      out[j] = MUTED_RGB[0];
      out[j + 1] = MUTED_RGB[1];
      out[j + 2] = MUTED_RGB[2];
      out[j + 3] = 255;
      continue;
    }
    // Black ink → cream text (invert onto instrument TEXT).
    const ir = 255 - r;
    const ig = 255 - g;
    const ib = 255 - b;
    out[j] = Math.round((ir / 255) * TEXT_RGB[0]);
    out[j + 1] = Math.round((ig / 255) * TEXT_RGB[1]);
    out[j + 2] = Math.round((ib / 255) * TEXT_RGB[2]);
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
    // Drop paper only. Keep ink (including charcoal u-card #545454) fully opaque —
    // do not scale alpha by luminance (that washed the u-card to a lighter gray).
    if (lum >= 250) {
      out[j] = out[j + 1] = out[j + 2] = out[j + 3] = 0;
      continue;
    }
    if (lum >= 235) {
      out[j] = r;
      out[j + 1] = g;
      out[j + 2] = b;
      out[j + 3] = Math.round(((250 - lum) / 15) * 255);
      continue;
    }
    out[j] = r;
    out[j + 1] = g;
    out[j + 2] = b;
    out[j + 3] = 255;
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

function svgWrap(pngBuf, w, h) {
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
  <polygon fill="${TEXT}" points="4,15.59 37.25,16.36 59.89,59.13 4,57.59"/>
  <polygon fill="${MUTED}" points="4,15.48 59.89,10.78 59.89,59.34 4,57.92"/>
</svg>
`;

const markHalt = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="buusdo halt">
  <title>buusdo</title>
  <polygon fill="${HALT}" points="4,15.59 37.25,16.36 59.89,59.13 4,57.59"/>
  <polygon fill="${TEXT}" points="4,15.48 59.89,10.78 59.89,59.34 4,57.92"/>
</svg>
`;

const faviconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="buusdo">
  <title>buusdo</title>
  <rect width="64" height="64" fill="${BG}"/>
  <polygon fill="${TEXT}" points="4,15.59 37.25,16.36 59.89,59.13 4,57.59"/>
  <polygon fill="${HALT}" points="4,15.48 59.89,10.78 59.89,59.34 4,57.92"/>
</svg>
`;

const templateSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <polygon fill="#ffffff" points="4,15.59 37.25,16.36 59.89,59.13 4,57.59"/>
  <polygon fill="#ffffff" fill-opacity="0.55" points="4,15.48 59.89,10.78 59.89,59.34 4,57.92"/>
</svg>
`;

/** Build a multi-size ICO that embeds PNG payloads (Vista+). */
function buildPngIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const entries = [];
  let offset = 6 + count * 16;
  for (const png of pngBuffers) {
    const meta = sharpMetaSize(png);
    const entry = Buffer.alloc(16);
    entry.writeUInt8(meta.width >= 256 ? 0 : meta.width, 0);
    entry.writeUInt8(meta.height >= 256 ? 0 : meta.height, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }
  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

function sharpMetaSize(png) {
  // Width/height are encoded in IHDR; read without async for known buffers we just wrote.
  const w = png.readUInt32BE(16);
  const h = png.readUInt32BE(20);
  return { width: w, height: h };
}

async function pngFromSvg(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

const designerPath = path.join(sourceDir, "buusdo-wordmark-paths.svg");
let wordSrc;
if (fs.existsSync(designerPath)) {
  // Prefer path SVG (frozen charcoal #545454 u-card) over light-plate raster.
  wordSrc = await sharp(designerPath).png().toBuffer();
  console.info("[sync:brand-web] Using designer path wordmark:", path.relative(root, designerPath));
} else {
  wordSrc = fs.readFileSync(path.join(sourceDir, "buusdo-wordmark-light-plate.png"));
  console.info(
    "[sync:brand-web] No designer path wordmark yet — place shared/brand/source/buusdo-wordmark-paths.svg when available.",
  );
}
const logoSrc = fs.readFileSync(
  path.join(sourceDir, "buusdo-logo-light-plate.png"),
);

const wordDark = await toDarkTransparent(wordSrc);
const wordLight = await toLightTransparent(wordSrc);
const logoDark = await toDarkTransparent(logoSrc);
const logoLight = await toLightTransparent(logoSrc);
const wordMeta = await sharp(wordDark).metadata();
const logoMeta = await sharp(logoDark).metadata();

for (const rel of targets) {
  const dir = path.join(root, rel);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "buusdo-wordmark.png"), wordDark);
  fs.writeFileSync(
    path.join(dir, "buusdo-wordmark.svg"),
    svgWrap(wordDark, wordMeta.width, wordMeta.height),
  );
  fs.writeFileSync(path.join(dir, "buusdo-logo.png"), logoDark);
  fs.writeFileSync(
    path.join(dir, "buusdo-logo.svg"),
    svgWrap(logoDark, logoMeta.width, logoMeta.height),
  );
  fs.writeFileSync(path.join(dir, "buusdo-wordmark-on-light.png"), wordLight);
  fs.writeFileSync(path.join(dir, "buusdo-logo-on-light.png"), logoLight);
  fs.writeFileSync(path.join(dir, "buusdo-mark.svg"), markDark);
  fs.writeFileSync(path.join(dir, "buusdo-mark-halt.svg"), markHalt);
  // Drop geometric fake wordmark if present
  const fake = path.join(dir, "buusdo-wordmark-vector.svg");
  if (fs.existsSync(fake)) fs.unlinkSync(fake);
}

// Favicons
for (const p of [
  "public/favicon.svg",
  "china-pages/assets/favicon.svg",
]) {
  fs.writeFileSync(path.join(root, p), faviconSvg);
}
const fav32 = await pngFromSvg(faviconSvg, 32);
fs.writeFileSync(path.join(root, "public/favicon.png"), fav32);
fs.writeFileSync(path.join(root, "china-pages/assets/favicon.png"), fav32);
fs.writeFileSync(path.join(root, "desktop-app/public/favicon.png"), fav32);
fs.writeFileSync(
  path.join(root, "public/brand/apple-touch-icon.png"),
  await pngFromSvg(faviconSvg, 180),
);

// Extension toolbar icons
for (const [name, size] of [
  ["icon16.png", 16],
  ["icon48.png", 48],
  ["icon128.png", 128],
]) {
  fs.writeFileSync(
    path.join(root, "extension/icons", name),
    await pngFromSvg(faviconSvg, size),
  );
}

// Desktop tray
fs.writeFileSync(
  path.join(root, "desktop-app/assets/tray-icon.png"),
  await pngFromSvg(faviconSvg, 32),
);
fs.writeFileSync(
  path.join(root, "desktop-app/assets/tray-icon-template.png"),
  await pngFromSvg(templateSvg, 32),
);
const icoSizes = [16, 32, 48, 256];
const icoPngs = [];
for (const size of icoSizes) {
  icoPngs.push(await pngFromSvg(faviconSvg, size));
}
fs.writeFileSync(
  path.join(root, "desktop-app/assets/tray-icon.ico"),
  buildPngIco(icoPngs),
);
// tray-icon.png is already 32px — do not also ship tray-icon-32.png (breaks pack basename set).

// Safari mac AppIcon set (dark field + Halt)
const safariIconDir = path.join(
  root,
  "safari/Preventive Shield/Preventive Shield/Assets.xcassets/AppIcon.appiconset",
);
const safariMap = [
  ["mac-icon-16@1x.png", 16],
  ["mac-icon-16@2x.png", 32],
  ["mac-icon-32@1x.png", 32],
  ["mac-icon-32@2x.png", 64],
  ["mac-icon-128@1x.png", 128],
  ["mac-icon-128@2x.png", 256],
  ["mac-icon-256@1x.png", 256],
  ["mac-icon-256@2x.png", 512],
  ["mac-icon-512@1x.png", 512],
  ["mac-icon-512@2x.png", 1024],
];
if (fs.existsSync(safariIconDir)) {
  for (const [name, size] of safariMap) {
    fs.writeFileSync(
      path.join(safariIconDir, name),
      await pngFromSvg(faviconSvg, size),
    );
  }
  fs.writeFileSync(
    path.join(
      root,
      "safari/Preventive Shield/Preventive Shield/Resources/Icon.png",
    ),
    await pngFromSvg(faviconSvg, 1024),
  );
}

// Safari LargeIcon.imageset (toolbar / about chrome) — dark field + Halt
const largeIconDir = path.join(
  root,
  "safari/Preventive Shield/Preventive Shield/Assets.xcassets/LargeIcon.imageset",
);
if (fs.existsSync(largeIconDir)) {
  const large1 = await pngFromSvg(faviconSvg, 128);
  const large2 = await pngFromSvg(faviconSvg, 256);
  const large3 = await pngFromSvg(faviconSvg, 384);
  fs.writeFileSync(path.join(largeIconDir, "LargeIcon.png"), large1);
  fs.writeFileSync(path.join(largeIconDir, "LargeIcon@2x.png"), large2);
  fs.writeFileSync(path.join(largeIconDir, "LargeIcon@3x.png"), large3);
  fs.writeFileSync(
    path.join(largeIconDir, "Contents.json"),
    `${JSON.stringify(
      {
        images: [
          { idiom: "universal", filename: "LargeIcon.png", scale: "1x" },
          { idiom: "universal", filename: "LargeIcon@2x.png", scale: "2x" },
          { idiom: "universal", filename: "LargeIcon@3x.png", scale: "3x" },
        ],
        info: { author: "xcode", version: 1 },
      },
      null,
      2,
    )}\n`,
  );
}

// OG (always). Store FRAME is captured by Playwright Halt fixture — do not overwrite.
const wordmarkOg = await sharp(wordDark)
  .resize({ width: 720, withoutEnlargement: true })
  .png()
  .toBuffer();
const wm = await sharp(wordmarkOg).metadata();
await sharp({
  create: { width: 1200, height: 630, channels: 3, background: BG },
})
  .composite([
    {
      input: wordmarkOg,
      left: Math.round((1200 - wm.width) / 2),
      top: Math.round((630 - wm.height) / 2),
    },
  ])
  .png()
  .toFile(path.join(root, "public/og.png"));

console.info(
  "[sync:brand-web] Store FRAME left to Playwright: npm run capture:store-halt-frame",
);

console.log(
  `Synced brand + favicon/tray/OG/Safari/extension icons → ${targets.join(", ")}`,
);
