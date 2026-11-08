/**
 * MUST_STAY_FULL_LOCALES has a single JSON source shared with the CI summary script.
 *
 *   npx tsx --test tests/must-stay-full-source.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { MUST_STAY_FULL_LOCALES } from "../i18n/pack-coverage";

test("must-stay-full-locales.json matches pack-coverage export", () => {
  const fromJson = JSON.parse(
    readFileSync(path.join("i18n/must-stay-full-locales.json"), "utf8")
  ) as string[];
  assert.deepEqual([...MUST_STAY_FULL_LOCALES], fromJson);
  assert.ok(fromJson.includes("cs"));
  assert.ok(fromJson.includes("lt"));
  assert.ok(fromJson.includes("bg"));
});
