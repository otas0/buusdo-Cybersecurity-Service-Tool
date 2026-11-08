import assert from "node:assert/strict";
import test from "node:test";
import { LOCALE_IDS } from "../i18n/locales";
import {
  FULL_PACK_MIN_KEYS,
  formatPackCoverageSummary,
  isFullLocalePack,
  showsPartialPackBanner
} from "../i18n/pack-coverage";

test("FULL_PACK_MIN_KEYS is exported and near EN snapshot size", () => {
  assert.ok(FULL_PACK_MIN_KEYS >= 400);
  const summary = formatPackCoverageSummary(LOCALE_IDS);
  console.info(summary);
  assert.match(summary, /minKeys=\d+/);
  assert.match(summary, /xh=\d+%:(full|partial)/);
  for (const id of ["xh", "af", "zu", "st", "tn", "nso", "ss", "ve", "ts", "nr", "fr", "es", "de"]) {
    assert.equal(isFullLocalePack(id), true, id);
    assert.equal(showsPartialPackBanner(id), false, id);
  }
  assert.equal(showsPartialPackBanner("bg"), true);
});
