/**
 * Extension locale region keys stay in MessageBag / packs (website + sync scripts).
 * Popup no longer renders #langSelect optgroups — OS language drives UI.
 *
 *   npx tsx --test tests/popup-optgroup-i18n.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();
const REQUIRED = [
  "langRegionGlobal",
  "langRegionEastAsia",
  "langRegionEurope",
  "langRegionPacific",
  "langRegionSoutheastAsia",
  "langRegionSouthernAfrica"
] as const;

test("slim popup has no langSelect optgroups", () => {
  const html = readFileSync(join(root, "extension/popup/popup.html"), "utf8");
  assert.doesNotMatch(html, /id="langSelect"/);
  assert.doesNotMatch(html, /data-i18n-label=/);
  assert.match(html, /id="manageListsLink"/);
});

test("EN MessageBag and packs include langRegion* keys", () => {
  const messages = readFileSync(join(root, "i18n/messages.ts"), "utf8");
  const enPack = JSON.parse(
    readFileSync(join(root, "i18n/packs/_en.snapshot.json"), "utf8")
  ) as Record<string, string>;
  for (const key of REQUIRED) {
    assert.match(messages, new RegExp(`${key}:`), `messages.ts missing ${key}`);
    assert.ok(enPack[key]?.trim(), `_en.snapshot missing ${key}`);
  }
});

test("it / zh-Hans packs flip Europe and East Asia region labels", () => {
  const it = JSON.parse(readFileSync(join(root, "i18n/packs/it.json"), "utf8")) as Record<
    string,
    string
  >;
  const zh = JSON.parse(readFileSync(join(root, "i18n/packs/zh-Hans.json"), "utf8")) as Record<
    string,
    string
  >;
  const en = JSON.parse(
    readFileSync(join(root, "i18n/packs/_en.snapshot.json"), "utf8")
  ) as Record<string, string>;
  assert.equal(it.langRegionEurope, "Europa");
  assert.equal(zh.langRegionEastAsia, "东亚");
  assert.notEqual(it.langRegionEurope, en.langRegionEurope);
  assert.notEqual(zh.langRegionEastAsia, en.langRegionEastAsia);
  assert.notEqual(it.langRegionEurope, zh.langRegionEurope);
  const shared = readFileSync(join(root, "extension/shared/i18n.js"), "utf8");
  assert.match(shared, /langRegionEurope":?\s*"Europa"/);
  assert.match(shared, /langRegionEastAsia:\s*"东亚"/);
});
