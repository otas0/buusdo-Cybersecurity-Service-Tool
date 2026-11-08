/**
 * LocaleRecommendModal pins FREQUENT_LOCALE_IDS (LanguageSwitcher no longer uses them).
 *
 *   npx tsx --test tests/frequent-locale-ids-parity.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { FREQUENT_LOCALE_IDS } from "../i18n/locales";

test("FREQUENT_LOCALE_IDS lists majors used by LocaleRecommendModal only", () => {
  assert.deepEqual([...FREQUENT_LOCALE_IDS], [
    "en",
    "zh-Hans",
    "zh-Hant",
    "ja",
    "pt-PT",
    "de",
    "fr",
    "es"
  ]);
  const switcher = readFileSync("components/LanguageSwitcher.tsx", "utf8");
  const recommend = readFileSync("components/LocaleRecommendModal.tsx", "utf8");
  assert.doesNotMatch(switcher, /FREQUENT_LOCALE_IDS/);
  assert.doesNotMatch(switcher, /locale-frequent/);
  assert.match(recommend, /FREQUENT_LOCALE_IDS/);
  assert.doesNotMatch(recommend, /\["en", "zh-Hans"/);
});
