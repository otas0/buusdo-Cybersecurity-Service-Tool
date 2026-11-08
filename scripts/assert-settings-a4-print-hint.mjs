/**
 * Product chrome must not surface an A4 poster download CTA.
 *
 *   node --import tsx scripts/assert-settings-a4-print-hint.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

for (const [rel, needles] of [
  ["components/SettingsPanel.tsx", ["downloadA4Poster", "downloadA4PosterHint", "settings-download-a4-poster", "settings-a4-poster-print-hint", "/promo/poster.html"]],
  ["components/AppShell.tsx", ["downloadA4Poster", "nav-download-a4-poster", "/promo/poster.html", "nav-link-a4"]],
  ["extension/popup/popup.html", ["a4PosterLink", "popup-a4-poster", "/promo/poster.html"]],
  ["desktop-app/public/index.html", ["footA4Poster", "foot-a4-poster", "/promo/poster.html"]],
]) {
  const src = readFileSync(join(root, rel), "utf8");
  for (const needle of needles) {
    if (src.includes(needle)) {
      console.error(`[assert-settings-a4-print-hint] ${rel} must not include ${needle}`);
      process.exit(1);
    }
  }
}
console.info("[assert-settings-a4-print-hint] OK — no A4 poster CTAs in product chrome");
