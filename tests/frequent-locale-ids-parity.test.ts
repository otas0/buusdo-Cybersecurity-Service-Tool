/**
 * LocaleRecommendModal pins via recommendPinnedLocaleIds (LanguageSwitcher has no Frequent strip).
 *
 *   npx tsx --test tests/frequent-locale-ids-parity.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  FREQUENT_LOCALE_IDS,
  LOCALE_RECOMMEND_PIN_MAX,
  recommendPinnedLocaleIds
} from "../i18n/locales";

test("FREQUENT_LOCALE_IDS lists recommend majors only", () => {
  assert.deepEqual([...FREQUENT_LOCALE_IDS], ["en", "zh-Hans", "ja", "pt-PT", "de"]);
  const switcher = readFileSync("components/LanguageSwitcher.tsx", "utf8");
  const recommend = readFileSync("components/LocaleRecommendModal.tsx", "utf8");
  assert.doesNotMatch(switcher, /FREQUENT_LOCALE_IDS/);
  assert.doesNotMatch(switcher, /locale-frequent/);
  assert.match(recommend, /recommendPinnedLocaleIds/);
  assert.doesNotMatch(recommend, /FREQUENT_LOCALE_IDS/);
});

test("recommendPinnedLocaleIds dedupes suggested and caps at PIN_MAX", () => {
  assert.equal(LOCALE_RECOMMEND_PIN_MAX, 6);
  const pins = recommendPinnedLocaleIds("fr");
  assert.equal(pins[0], "fr");
  assert.ok(pins.length <= LOCALE_RECOMMEND_PIN_MAX);
  assert.equal(new Set(pins).size, pins.length);
  assert.deepEqual(recommendPinnedLocaleIds("en")[0], "en");
});
