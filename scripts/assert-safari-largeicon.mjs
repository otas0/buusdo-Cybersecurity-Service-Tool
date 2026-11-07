/**
 * Safari LargeIcon.imageset must sit on instrument dark field (#0e0e0e), not a white plate.
 * Complements Xcode/Simulator preview — CI fails on white corners / white-majority rasters.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(
  root,
  "safari/Preventive Shield/Preventive Shield/Assets.xcassets/LargeIcon.imageset",
);
const files = ["LargeIcon.png", "LargeIcon@2x.png", "LargeIcon@3x.png"];

function isNearWhite(r, g, b, a) {
  if (a < 200) return false;
  return r > 240 && g > 240 && b > 240;
}

function isNearDarkField(r, g, b, a) {
  if (a < 200) return true; // transparent OK over dark chrome
  return r < 40 && g < 40 && b < 40;
}

let failed = false;
for (const name of files) {
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) {
    console.error(`[assert-safari-largeicon] missing ${name}`);
    failed = true;
    continue;
  }
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  for (const [x, y] of corners) {
    const i = (y * width + x) * channels;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (isNearWhite(r, g, b, a)) {
      console.error(
        `[assert-safari-largeicon] ${name} corner (${x},${y}) is white plate rgba(${r},${g},${b},${a})`,
      );
      failed = true;
    } else if (!isNearDarkField(r, g, b, a)) {
      console.error(
        `[assert-safari-largeicon] ${name} corner (${x},${y}) not dark-field rgba(${r},${g},${b},${a})`,
      );
      failed = true;
    }
  }
  let white = 0;
  const total = width * height;
  for (let i = 0; i < data.length; i += channels) {
    if (isNearWhite(data[i], data[i + 1], data[i + 2], data[i + 3])) white += 1;
  }
  if (white / total > 0.05) {
    console.error(
      `[assert-safari-largeicon] ${name} too many white pixels (${white}/${total}) — re-run npm run sync:brand-web`,
    );
    failed = true;
    continue;
  }
  console.info(`[assert-safari-largeicon] OK ${name} white=${white}/${total}`);
}

if (failed) process.exit(1);
console.info(
  "[assert-safari-largeicon] OK — also preview in Safari wrapper Xcode (no white plate behind LargeIcon)",
);
