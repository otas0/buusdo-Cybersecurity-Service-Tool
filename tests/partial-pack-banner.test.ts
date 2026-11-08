import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { showsPartialPackBanner } from "../i18n/pack-coverage";

test("showsPartialPackBanner is false for complete locale packs", () => {
  assert.equal(showsPartialPackBanner("en"), false);
  assert.equal(showsPartialPackBanner("pt-PT"), false);
  assert.equal(showsPartialPackBanner("zh-Hans"), false);
  assert.equal(showsPartialPackBanner("xh"), false);
  assert.equal(showsPartialPackBanner("zu"), false);
  assert.equal(showsPartialPackBanner("af"), false);
  assert.equal(showsPartialPackBanner("ss"), false);
  assert.equal(showsPartialPackBanner("ve"), false);
  assert.equal(showsPartialPackBanner("ts"), false);
  assert.equal(showsPartialPackBanner("nr"), false);
  assert.equal(showsPartialPackBanner("fr"), false);
  assert.equal(showsPartialPackBanner("es"), false);
  assert.equal(showsPartialPackBanner("it"), false);
  assert.equal(showsPartialPackBanner("nl"), false);
  assert.equal(showsPartialPackBanner("pl"), false);
  assert.equal(showsPartialPackBanner("sv"), false);
  assert.equal(showsPartialPackBanner("da"), false);
  assert.equal(showsPartialPackBanner("fi"), false);
  assert.equal(showsPartialPackBanner("nb"), false);
  assert.equal(showsPartialPackBanner("ca"), false);
  assert.equal(showsPartialPackBanner("sl"), false);
  assert.equal(showsPartialPackBanner("ga"), false);
  assert.equal(showsPartialPackBanner("mt"), false);
  assert.equal(showsPartialPackBanner("uk"), false);
  assert.equal(showsPartialPackBanner("is"), false);
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
