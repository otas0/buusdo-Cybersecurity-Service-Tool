/**
 * Web brand assets must be transparent (page --bg shows through).
 * Fail if wordmark/logo PNGs lack alpha or are still white-plate rasters.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const checks = [
  "public/brand/buusdo-wordmark.png",
  "public/brand/buusdo-logo.png",
  "china-pages/assets/buusdo-wordmark.png",
];

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
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let transparent = 0;
  for (let i = 3; i < data.length; i += info.channels) {
    if (data[i] === 0) transparent += 1;
  }
  const total = info.width * info.height;
  if (transparent / total < 0.2) {
    console.error(
      `FAIL ${rel}: too little transparency (${transparent}/${total}) — likely white plate`,
    );
    failed = true;
    continue;
  }
  console.info(`OK ${rel} alpha transparent=${transparent}/${total}`);
}

if (failed) process.exit(1);
