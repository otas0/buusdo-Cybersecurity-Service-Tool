/**
 * Settings Appearance is hint-only — no dual Dark/Light buttons in ThemeSwitch.
 *
 *   npx tsx --test tests/settings-theme-hint-only.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("ThemeSwitch settings surface is themeHeaderHint only", () => {
  const src = readFileSync("components/ThemeSwitch.tsx", "utf8");
  const settingsFn = src.slice(src.indexOf("export function ThemeSwitch"));
  assert.match(settingsFn, /themeHeaderHint/);
  assert.match(settingsFn, /theme-header-hint/);
  assert.doesNotMatch(settingsFn, /<button/);
  assert.doesNotMatch(settingsFn, /theme-switch-row/);
  assert.doesNotMatch(settingsFn, /theme-opt/);
});

test("SettingsPanel mounts ThemeSwitch once under settings-appearance", () => {
  const panel = readFileSync("components/SettingsPanel.tsx", "utf8");
  assert.match(panel, /settings-appearance/);
  assert.match(panel, /<ThemeSwitch locale=\{locale\} \/>/);
  assert.equal([...panel.matchAll(/<ThemeSwitch/g)].length, 1);
});
