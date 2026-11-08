/**
 * Extension popup #langSelect optgroups must be MessageBag / pack keyed
 * (data-i18n-label → langRegion*).
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
  "langRegionSoutheastAsia"
] as const;

test("popup optgroups carry data-i18n-label MessageBag keys", () => {
  const html = readFileSync(join(root, "extension/popup/popup.html"), "utf8");
  const labels = [...html.matchAll(/data-i18n-label="([^"]+)"/g)].map((m) => m[1]);
  for (const key of REQUIRED) {
    assert.ok(labels.includes(key), `popup missing data-i18n-label=${key}`);
  }
  const popupJs = readFileSync(join(root, "extension/popup/popup.js"), "utf8");
  assert.match(popupJs, /data-i18n-label/, "popup.js must apply optgroup labels from i18n");
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
