/**
 * Frequent majors + recommend pin order share one snapshot (FREQUENT_LOCALE_IDS).
 *
 *   npx tsx --test tests/frequent-recommend-pin-snapshot.test.ts
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FREQUENT_LOCALE_IDS,
  LOCALE_RECOMMEND_PIN_MAX,
  recommendPinnedLocaleIds
} from "../i18n/locales";

test("FREQUENT_LOCALE_IDS snapshot is five majors (lighter first paint)", () => {
  assert.deepEqual([...FREQUENT_LOCALE_IDS], ["en", "zh-Hans", "ja", "pt-PT", "de"]);
});

test("recommendPinnedLocaleIds: suggested already in Frequent → length 5", () => {
  assert.deepEqual(recommendPinnedLocaleIds("zh-Hans"), [
    "zh-Hans",
    "en",
    "ja",
    "pt-PT",
    "de"
  ]);
});

test("recommendPinnedLocaleIds: suggested outside Frequent → length 6 (pin max)", () => {
  const pins = recommendPinnedLocaleIds("fr");
  assert.equal(pins.length, LOCALE_RECOMMEND_PIN_MAX);
  assert.deepEqual(pins, ["fr", "en", "zh-Hans", "ja", "pt-PT", "de"]);
});

test("recommendPinnedLocaleIds never exceeds LOCALE_RECOMMEND_PIN_MAX", () => {
  assert.ok(recommendPinnedLocaleIds("zu").length <= LOCALE_RECOMMEND_PIN_MAX);
  assert.equal(LOCALE_RECOMMEND_PIN_MAX, 6);
});
