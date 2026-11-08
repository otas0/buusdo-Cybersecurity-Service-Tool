/**
 * MessageBag langRegion* must cover every LOCALE_REGION_ORDER id (EN + packs).
 *
 *   npx tsx --test tests/lang-region-labels-parity.test.ts
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { LOCALE_REGION_LABELS, LOCALE_REGION_ORDER } from "../i18n/locales";
import { messages } from "../i18n/messages";

const KEYS = {
  global: "langRegionGlobal",
  "east-asia": "langRegionEastAsia",
  europe: "langRegionEurope",
  "southern-africa": "langRegionSouthernAfrica",
  pacific: "langRegionPacific",
  "southeast-asia": "langRegionSoutheastAsia"
} as const;

test("EN MessageBag langRegion* matches LOCALE_REGION_LABELS.en", () => {
  const en = messages.en as Record<string, string>;
  for (const region of LOCALE_REGION_ORDER) {
    const key = KEYS[region];
    assert.equal(en[key], LOCALE_REGION_LABELS[region].en, region);
  }
});

test("LanguageSwitcher maps regions through MessageBag keys", () => {
  const src = readFileSync("components/LanguageSwitcher.tsx", "utf8");
  for (const key of Object.values(KEYS)) {
    assert.match(src, new RegExp(key));
  }
});

test("every pack includes all langRegion* keys (non-empty)", () => {
  const packs = readdirSync("i18n/packs").filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  for (const file of packs) {
    const bag = JSON.parse(readFileSync(`i18n/packs/${file}`, "utf8")) as Record<string, string>;
    for (const key of Object.values(KEYS)) {
      assert.ok(bag[key]?.trim(), `${file} missing ${key}`);
    }
  }
});
