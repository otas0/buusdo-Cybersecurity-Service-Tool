import assert from "node:assert/strict";
import test from "node:test";
import { FULL_PACK_MIN_KEYS, isFullLocalePack, showsPartialPackBanner } from "../i18n/pack-coverage";

test("FULL_PACK_MIN_KEYS is exported and near EN snapshot size", () => {
  assert.ok(FULL_PACK_MIN_KEYS >= 400);
  console.info(`[pack-coverage] FULL_PACK_MIN_KEYS=${FULL_PACK_MIN_KEYS}`);
  assert.equal(isFullLocalePack("xh"), true);
  assert.equal(isFullLocalePack("af"), true);
  assert.equal(isFullLocalePack("zu"), true);
  assert.equal(isFullLocalePack("st"), true);
  assert.equal(isFullLocalePack("tn"), true);
  assert.equal(isFullLocalePack("nso"), true);
  assert.equal(showsPartialPackBanner("xh"), false);
  assert.equal(showsPartialPackBanner("ss"), true);
});
