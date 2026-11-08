/**
 * Workers/website product chrome must not ship an A4 poster download CTA.
 *
 *   npx tsx --test tests/website-no-a4-poster.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("AppShell and SettingsPanel have zero A4 poster CTAs", () => {
  const appShell = readFileSync("components/AppShell.tsx", "utf8");
  const settings = readFileSync("components/SettingsPanel.tsx", "utf8");
  const css = readFileSync("app/shield.css", "utf8");
  for (const [label, src] of [["AppShell", appShell], ["SettingsPanel", settings]] as const) {
    assert.doesNotMatch(src, /downloadA4Poster/, label);
    assert.doesNotMatch(src, /nav-download-a4-poster|settings-download-a4-poster/, label);
    assert.doesNotMatch(src, /\/promo\/poster\.html/, label);
  }
  assert.doesNotMatch(css, /nav-link-a4|nav-a4-full|nav-a4-short/);
});

test("extension popup and desktop footer have zero A4 poster CTAs", () => {
  const popup = readFileSync("extension/popup/popup.html", "utf8");
  const desktop = readFileSync("desktop-app/public/index.html", "utf8");
  assert.doesNotMatch(popup, /a4PosterLink|popup-a4-poster|\/promo\/poster\.html/);
  assert.doesNotMatch(desktop, /footA4Poster|foot-a4-poster|\/promo\/poster\.html/);
});
