/**
 * LOCALE_REGION_LABELS.zh must match MessageBag langRegion* in zh-Hans pack.
 *
 *   npx tsx --test tests/lang-region-zh-crosscheck.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { LOCALE_REGION_LABELS, LOCALE_REGION_ORDER } from "../i18n/locales";

const KEYS = {
  global: "langRegionGlobal",
  "east-asia": "langRegionEastAsia",
  europe: "langRegionEurope",
  "southern-africa": "langRegionSouthernAfrica",
  pacific: "langRegionPacific",
  "southeast-asia": "langRegionSoutheastAsia"
} as const;

test("LOCALE_REGION_LABELS.zh matches zh-Hans pack langRegion*", () => {
  const pack = JSON.parse(readFileSync("i18n/packs/zh-Hans.json", "utf8")) as Record<string, string>;
  for (const region of LOCALE_REGION_ORDER) {
    const key = KEYS[region];
    assert.equal(
      pack[key],
      LOCALE_REGION_LABELS[region].zh,
      `${region} / ${key}: pack=${pack[key]} labels.zh=${LOCALE_REGION_LABELS[region].zh}`
    );
  }
});

test("zh-Hant pack uses Traditional forms for East Asia / Southeast Asia labels", () => {
  const pack = JSON.parse(readFileSync("i18n/packs/zh-Hant.json", "utf8")) as Record<string, string>;
  assert.match(pack.langRegionEastAsia || "", /東亞|东亚/);
  assert.match(pack.langRegionSoutheastAsia || "", /東南亞|东南亚/);
  // Prefer Traditional where we ship it
  if (pack.langRegionEastAsia) {
    assert.doesNotMatch(pack.langRegionEastAsia, /^东亚$/);
  }
});
