/**
 * CI hard-fail if LanguageSwitcher / shield.css reintroduce the Frequent strip.
 *
 *   npx tsx --test tests/language-switcher-no-frequent-guard.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const FORBIDDEN = [
  /FREQUENT_LOCALE_IDS/,
  /locale-frequent/,
  /lang-panel-frequent/,
  /lang-frequent-btn/,
  /langPanelFrequent/
];

test("LanguageSwitcher must not contain Frequent strip markers", () => {
  const src = readFileSync("components/LanguageSwitcher.tsx", "utf8");
  for (const re of FORBIDDEN) {
    assert.doesNotMatch(src, re, `LanguageSwitcher matched ${re}`);
  }
});

test("shield.css must not contain Frequent strip rules", () => {
  const css = readFileSync("app/shield.css", "utf8");
  assert.doesNotMatch(css, /lang-panel-frequent/);
  assert.doesNotMatch(css, /lang-frequent-btn/);
});

test("locale-panel-regions Playwright must assert Frequent absence", () => {
  const spec = readFileSync("playwright/locale-panel-regions.spec.ts", "utf8");
  assert.match(spec, /locale-frequent[\s\S]*toHaveCount\(0\)/);
  assert.doesNotMatch(spec, /toBeVisible\(\);\s*\n\s*await expect\(page\.getByTestId\("locale-frequent"\)\)\.toBeVisible/);
});
