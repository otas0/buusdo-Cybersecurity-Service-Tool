import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { showsPartialPackBanner } from "../i18n/pack-coverage";

test("showsPartialPackBanner false for full packs, true for thin packs", () => {
  assert.equal(showsPartialPackBanner("en"), false);
  assert.equal(showsPartialPackBanner("pt-PT"), false);
  assert.equal(showsPartialPackBanner("zh-Hans"), false);
  assert.equal(showsPartialPackBanner("xh"), false);
  assert.equal(showsPartialPackBanner("zu"), false);
  assert.equal(showsPartialPackBanner("af"), false);
  assert.equal(showsPartialPackBanner("ss"), true);
  assert.equal(showsPartialPackBanner("ve"), true);
});

test("Settings and Privacy panels both render partialPackBanner", () => {
  const root = process.cwd();
  const settings = readFileSync(join(root, "components/SettingsPanel.tsx"), "utf8");
  const privacy = readFileSync(join(root, "components/PrivacyPanel.tsx"), "utf8");
  assert.match(settings, /settings-partial-pack-banner/);
  assert.match(settings, /showsPartialPackBanner\(locale\)/);
  assert.match(settings, /partialPackBanner/);
  assert.match(privacy, /privacy-partial-pack-banner/);
  assert.match(privacy, /showsPartialPackBanner\(locale\)/);
  assert.match(privacy, /partialPackBanner/);
});
