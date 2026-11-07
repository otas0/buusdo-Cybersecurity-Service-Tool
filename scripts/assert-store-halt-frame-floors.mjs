/**
 * Platform-stable FRAME check: structural floors, not byte-identical git diff.
 * Sharp/libvips encodes differently on macOS vs Linux CI.
 *
 *   npm run capture:store-halt-frame && node scripts/assert-store-halt-frame-floors.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
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

if (failed) process.exit(1);
console.info("[assert-store-halt-frame-floors] OK (platform-stable structural floors)");
