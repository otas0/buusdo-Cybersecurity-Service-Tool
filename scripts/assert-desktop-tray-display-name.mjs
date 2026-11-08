/**
 * Tray user-facing title must be formalName (DISPLAY_NAME), not legacy PRODUCT folder.
 *
 *   node scripts/assert-desktop-tray-display-name.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brand = JSON.parse(readFileSync(join(root, "shared/brand.json"), "utf8"));
const formal = brand.formalName;
const userData = readFileSync(join(root, "desktop-app/src/user-data.js"), "utf8");
const launcher = readFileSync(join(root, "desktop-app/src/launcher.js"), "utf8");

if (!userData.includes(`DISPLAY_NAME = ${JSON.stringify(formal)}`) && !userData.includes(`DISPLAY_NAME = "${formal}"`)) {
  console.error(`[assert-desktop-tray-display-name] user-data.js DISPLAY_NAME must be ${JSON.stringify(formal)}`);
  process.exit(1);
}
if (!launcher.includes("DISPLAY_NAME")) {
  console.error("[assert-desktop-tray-display-name] launcher.js must use DISPLAY_NAME for tray title/tooltip");
  process.exit(1);
}
if (/title:\s*PRODUCT\b/.test(launcher) || /tooltip:\s*`\$\{PRODUCT\}/.test(launcher)) {
  console.error("[assert-desktop-tray-display-name] launcher tray title/tooltip must not use PRODUCT path name");
  process.exit(1);
}
console.info(`[assert-desktop-tray-display-name] OK DISPLAY_NAME=${JSON.stringify(formal)}`);
