/**
 * Desktop About FRAME capture must exist and stay wired to formalName / foot-about.
 *
 *   node scripts/assert-desktop-about-frame.mjs
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brand = JSON.parse(readFileSync(join(root, "shared/brand.json"), "utf8"));
const formal = brand.formalName;
const frame = join(root, "docs/store-screenshots/FRAME-desktop-about.png");
const capture = readFileSync(join(root, "scripts/capture-desktop-about-frame.mjs"), "utf8");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

if (!existsSync(frame)) {
  console.error(
    "[assert-desktop-about-frame] missing docs/store-screenshots/FRAME-desktop-about.png — run npm run capture:desktop-about-frame"
  );
  process.exit(1);
}
const size = statSync(frame).size;
if (size < 1500) {
  console.error(`[assert-desktop-about-frame] FRAME too small (${size} bytes) — re-capture`);
  process.exit(1);
}
if (!capture.includes("foot-about")) {
  console.error("[assert-desktop-about-frame] capture script must target foot-about");
  process.exit(1);
}
if (!capture.includes("FRAME-desktop-about.png")) {
  console.error("[assert-desktop-about-frame] capture script must write FRAME-desktop-about.png");
  process.exit(1);
}
if (!pkg.scripts?.["capture:desktop-about-frame"]) {
  console.error("[assert-desktop-about-frame] package.json missing capture:desktop-about-frame");
  process.exit(1);
}
const checkDesktop = pkg.scripts?.["check:desktop"] || "";
if (!checkDesktop.includes("assert:desktop-about-frame") && !checkDesktop.includes("assert-desktop-about-frame")) {
  console.error("[assert-desktop-about-frame] check:desktop must invoke assert:desktop-about-frame");
  process.exit(1);
}
const aboutHtml = readFileSync(join(root, "desktop-app/public/index.html"), "utf8");
if (!aboutHtml.includes(formal)) {
  console.error(
    `[assert-desktop-about-frame] desktop index About must contain formalName ${JSON.stringify(formal)}`
  );
  process.exit(1);
}
console.info(`[assert-desktop-about-frame] OK FRAME=${size}B formalName=${JSON.stringify(formal)}`);
