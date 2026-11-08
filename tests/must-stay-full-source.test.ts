/**
 * MUST_STAY_FULL_LOCALES has a single JSON source shared with the CI summary script.
 *
 *   npx tsx --test tests/must-stay-full-source.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { LOCALE_CATALOG } from "../i18n/locales";
import { MUST_STAY_FULL_LOCALES, isFullLocalePack } from "../i18n/pack-coverage";

test("must-stay-full-locales.json matches pack-coverage export", () => {
  const fromJson = JSON.parse(
    readFileSync(path.join("i18n/must-stay-full-locales.json"), "utf8")
  ) as string[];
  assert.deepEqual([...MUST_STAY_FULL_LOCALES], fromJson);
  assert.ok(fromJson.includes("cs"));
  assert.ok(fromJson.includes("lt"));
  assert.ok(fromJson.includes("bg"));
});

test("must-stay-full-locales.json ⊆ LOCALE_CATALOG ids", () => {
  const catalog = new Set(LOCALE_CATALOG.map((e) => e.id));
  const outside = MUST_STAY_FULL_LOCALES.filter((id) => !catalog.has(id));
  assert.equal(outside.length, 0, `not in catalog: ${outside.join(", ")}`);
});

test("Europe remainder sl/ca/ga/mt/uk/is stay full (regression)", () => {
  for (const id of ["sl", "ca", "ga", "mt", "uk", "is"] as const) {
    assert.equal(isFullLocalePack(id), true, id);
    assert.ok(MUST_STAY_FULL_LOCALES.includes(id), id);
  }
});
