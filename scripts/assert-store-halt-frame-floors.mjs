/**
 * Platform-stable FRAME check: structural floors, not byte-identical git diff.
 * Sharp/libvips encodes differently on macOS vs Linux CI.
 *
 *   npm run capture:store-halt-frame && node scripts/assert-store-halt-frame-floors.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { haltFrameStats, assertHaltFrameFloors } from "./store-halt-frame-stats.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "docs/store-screenshots");

const files = [
  "FRAME-formal-name.png",
  "FRAME-clear.png",
  "FRAME-hold.png",
];

let failed = false;
for (const name of files) {
  const full = path.join(dir, name);
  const stats = await haltFrameStats(full);
  // Clear/Hold lack Halt orange — only enforce dark field + size for those.
  if (name === "FRAME-formal-name.png") {
    const fails = assertHaltFrameFloors(stats, name);
    if (fails.length) {
      console.error(fails.join("\n"));
      failed = true;
    } else {
      console.info(
        `[assert-store-halt-frame-floors] OK ${name} dark=${stats.darkRatio.toFixed(3)} halt=${stats.haltCount}`,
      );
    }
  } else {
    const fails = [];
    if (stats.width !== 1280 || stats.height !== 800) {
      fails.push(`${name} size ${stats.width}x${stats.height} ≠ 1280x800`);
    }
    if (stats.darkRatio < 0.55) {
      fails.push(`${name} darkRatio ${stats.darkRatio.toFixed(3)} < 0.55`);
    }
    if (fails.length) {
      console.error(fails.join("\n"));
      failed = true;
    } else {
      console.info(
        `[assert-store-halt-frame-floors] OK ${name} dark=${stats.darkRatio.toFixed(3)}`,
      );
    }
  }
}

// Companion: Desktop About footer FRAME (packed into listing-frames.zip).
{
  const aboutName = "FRAME-desktop-about.png";
  const about = path.join(dir, aboutName);
  if (!fs.existsSync(about)) {
    console.error(
      `[assert-store-halt-frame-floors] missing ${aboutName} — run npm run capture:desktop-about-frame`,
    );
    failed = true;
  } else {
    const { data, info } = await sharp(about).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let muted = 0;
    let orange = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      if (data[i + 3] < 180) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (Math.abs(r - 0x8d) <= 22 && Math.abs(g - 0x89) <= 22 && Math.abs(b - 0x7f) <= 22) muted += 1;
      if (r >= 160 && g <= 120 && b <= 60 && r > g + 40) orange += 1;
    }
    if (info.width < 80 || info.height < 24) {
      console.error(
        `[assert-store-halt-frame-floors] ${aboutName} too small ${info.width}x${info.height}`,
      );
      failed = true;
    } else if (muted < 20) {
      console.error(
        `[assert-store-halt-frame-floors] ${aboutName} muted u missing (muted=${muted})`,
      );
      failed = true;
    } else if (orange > 120) {
      console.error(
        `[assert-store-halt-frame-floors] ${aboutName} Halt-orange too high (orange=${orange})`,
      );
      failed = true;
    } else {
      console.info(
        `[assert-store-halt-frame-floors] OK ${aboutName} ${info.width}x${info.height} muted=${muted}`,
      );
    }
  }
}

if (failed) process.exit(1);
console.info("[assert-store-halt-frame-floors] OK (platform-stable structural floors + About FRAME)");
