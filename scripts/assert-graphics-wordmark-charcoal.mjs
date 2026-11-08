/**
 * Spot-check Buusdo Graphics Enhancement Tool light wordmark uses shared u-card #545454.
 *
 * Default path (sibling clone):
 *   ../buusdo/docs/promo/logo-wordmark.png
 * Override:
 *   GRAPHICS_WORDMARK=/path/to/logo-wordmark.png node scripts/assert-graphics-wordmark-charcoal.mjs
 *
 * Spec: docs/BRAND_U_CARD.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [
  process.env.GRAPHICS_WORDMARK,
  path.join(root, "..", "buusdo", "docs", "promo", "logo-wordmark.png"),
  // Common clone: ~/buusdo (Graphics Enhancement Tool sibling)
  path.join(process.env.HOME || "", "buusdo", "docs", "promo", "logo-wordmark.png"),
].filter(Boolean);

const file = candidates.map((p) => path.resolve(p)).find((p) => fs.existsSync(p));

if (!file) {
  const detail =
    `[assert-graphics-wordmark-charcoal] missing Graphics logo-wordmark.png\n` +
    `Tried:\n${candidates.map((p) => `  - ${p}`).join("\n")}\n` +
    `Set GRAPHICS_WORDMARK=/path/to/logo-wordmark.png`;
  if (process.env.GRAPHICS_WORDMARK_REQUIRED === "1") {
    console.error(detail);
    process.exit(1);
  }
  console.info(`${detail}\nSoft-skip (set GRAPHICS_WORDMARK_REQUIRED=1 to hard-fail).`);
  process.exit(0);
}

const CHARCOAL = { r: 84, g: 84, b: 84 };
const HALT = { r: 0xff, g: 0x4d, b: 0x00 };

const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let charcoal = 0;
let charcoalOpaque = 0;
let orange = 0;
for (let i = 0; i < data.length; i += info.channels) {
  const a = data[i + 3];
  if (a < 200) continue;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  if (Math.abs(r - CHARCOAL.r) <= 14 && Math.abs(g - CHARCOAL.g) <= 14 && Math.abs(b - CHARCOAL.b) <= 14) {
    charcoal += 1;
    if (a === 255) charcoalOpaque += 1;
  }
  if (r > 180 && g < 130 && b < 80 && r > g + 40) orange += 1;
}

if (charcoal < 200) {
  console.error(
    `[assert-graphics-wordmark-charcoal] FAIL ${file}: expected #545454 u-card (found ${charcoal} px)`,
  );
  process.exit(1);
}
if (orange > 40) {
  console.error(
    `[assert-graphics-wordmark-charcoal] FAIL ${file}: u-card must not be Halt orange (${orange} px)`,
  );
  process.exit(1);
}

console.info(
  `[assert-graphics-wordmark-charcoal] OK ${file} charcoal=${charcoal} alpha255≈${charcoalOpaque}`,
);
