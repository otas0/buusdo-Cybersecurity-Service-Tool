/**
 * Web brand assets must be transparent (page --bg shows through).
 * On-light wordmark must keep charcoal u-card #545454 at full alpha (never Halt orange).
 * Dark-field wordmark must map that u-card to instrument MUTED #8d897f (not cream-invert).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const checks = [
  "public/brand/buusdo-wordmark.png",
  "public/brand/buusdo-logo.png",
  "china-pages/assets/buusdo-wordmark.png"
];

const CHARCOAL = { r: 84, g: 84, b: 84 };
const MUTED = { r: 0x8d, g: 0x89, b: 0x7f };
const HALT = { r: 0xff, g: 0x4d, b: 0x00 };

function near(a, b, tol = 12) {
  return Math.abs(a.r - b.r) <= tol && Math.abs(a.g - b.g) <= tol && Math.abs(a.b - b.b) <= tol;
}

async function countColors(rel) {
  const file = path.join(root, rel);
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  let charcoal = 0;
  let charcoalOpaque = 0;
  let muted = 0;
  let orange = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const a = data[i + 3];
    if (a === 0) {
      transparent += 1;
      continue;
    }
    const px = { r: data[i], g: data[i + 1], b: data[i + 2] };
    if (near(px, CHARCOAL, 14) && a >= 200) {
      charcoal += 1;
      if (a === 255) charcoalOpaque += 1;
    }
    if (a < 200) continue;
    if (near(px, MUTED, 14)) muted += 1;
    if (near(px, HALT, 30) && px.r > px.g + 40) orange += 1;
  }
  return {
    transparent,
    total: info.width * info.height,
    charcoal,
    charcoalOpaque,
    muted,
    orange,
    hasAlpha: true,
  };
}

let failed = false;
for (const rel of checks) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.error(`FAIL missing ${rel}`);
    failed = true;
    continue;
  }
  const meta = await sharp(file).metadata();
  if (!meta.hasAlpha) {
    console.error(`FAIL ${rel}: expected hasAlpha (got channels=${meta.channels})`);
    failed = true;
    continue;
  }
  const stats = await countColors(rel);
  if (stats.transparent / stats.total < 0.2) {
    console.error(
      `FAIL ${rel}: too little transparency (${stats.transparent}/${stats.total}) — likely white plate`
    );
    failed = true;
    continue;
  }
  if (stats.orange > 40) {
    console.error(`FAIL ${rel}: u-card must not be Halt orange (found ~${stats.orange} orange px)`);
    failed = true;
    continue;
  }
  console.info(`OK ${rel} alpha transparent=${stats.transparent}/${stats.total}`);
}

const onLightPaths = [
  "public/brand/buusdo-wordmark-on-light.png",
  "china-pages/assets/buusdo-wordmark-on-light.png",
  "extension/icons/buusdo-wordmark-on-light.png",
  "desktop-app/public/brand/buusdo-wordmark-on-light.png",
];
for (const onLight of onLightPaths) {
  if (!fs.existsSync(path.join(root, onLight))) {
    console.error(`FAIL missing ${onLight}`);
    failed = true;
    continue;
  }
  const stats = await countColors(onLight);
  if (stats.charcoal < 200) {
    console.error(`FAIL ${onLight}: expected charcoal #545454 u-card (found ${stats.charcoal} px)`);
    failed = true;
  } else if (stats.charcoalOpaque < stats.charcoal * 0.95) {
    console.error(
      `FAIL ${onLight}: charcoal u-card must be alpha=255 (opaque ${stats.charcoalOpaque}/${stats.charcoal})`,
    );
    failed = true;
  } else if (stats.orange > 40) {
    console.error(`FAIL ${onLight}: charcoal u-card must not be Halt orange`);
    failed = true;
  } else {
    console.info(
      `OK ${onLight} charcoal #545454 px=${stats.charcoal} alpha255=${stats.charcoalOpaque}`,
    );
  }
}

const darkWms = [
  "public/brand/buusdo-wordmark.png",
  "china-pages/assets/buusdo-wordmark.png",
  "extension/icons/buusdo-wordmark.png",
  "desktop-app/public/brand/buusdo-wordmark.png",
];
for (const darkWm of darkWms) {
  if (!fs.existsSync(path.join(root, darkWm))) {
    console.error(`FAIL missing ${darkWm}`);
    failed = true;
    continue;
  }
  const stats = await countColors(darkWm);
  if (stats.muted < 200) {
    console.error(
      `FAIL ${darkWm}: expected MUTED #8d897f u-card on dark field (found ${stats.muted} px)`,
    );
    failed = true;
  } else {
    console.info(`OK ${darkWm} muted u-card px=${stats.muted}`);
  }
}

const ogRel = "public/og.png";
if (fs.existsSync(path.join(root, ogRel))) {
  const stats = await countColors(ogRel);
  // OG composites dark wordmark — muted u-card must survive resize.
  if (stats.muted < 800) {
    console.error(
      `FAIL ${ogRel}: expected muted #8d897f u-card floor ≥800 (found ${stats.muted}) — re-run npm run sync:brand-web`,
    );
    failed = true;
  } else {
    console.info(`OK ${ogRel} muted u-card px=${stats.muted}`);
  }
} else {
  console.error(`FAIL missing ${ogRel}`);
  failed = true;
}

if (failed) process.exit(1);
