/**
 * Keep extension/shared/tokens.css identical to shared/tokens.css
 * (MV3 cannot load files outside the extension folder).
 *
 *   node scripts/sync-extension-tokens.mjs
 *   node scripts/sync-extension-tokens.mjs --check
 */
import { copyFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "shared/tokens.css");
const dest = join(root, "extension/shared/tokens.css");
const check = process.argv.includes("--check");

const a = readFileSync(src);
const b = readFileSync(dest);
if (Buffer.compare(a, b) === 0) {
  console.info("[sync-extension-tokens] OK — extension tokens match shared/tokens.css");
  process.exit(0);
}
if (check) {
  console.error(
    "[sync-extension-tokens] DRIFT — extension/shared/tokens.css ≠ shared/tokens.css. Run: npm run sync:extension-tokens"
  );
  process.exit(1);
}
copyFileSync(src, dest);
console.info("[sync-extension-tokens] copied shared/tokens.css → extension/shared/tokens.css");
