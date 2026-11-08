import assert from "node:assert/strict";
import test from "node:test";

test("desktop ja machine* keys are Japanese (not EN overlay leftovers)", async () => {
  const { STRINGS, t, normalizeUiLang } = await import("../desktop-app/public/js/i18n.js");
  assert.equal(normalizeUiLang("ja"), "ja");
  const ja = STRINGS.ja;
  const en = STRINGS.en;
  assert.ok(ja);
  assert.match(ja.machineQuarantineEmpty, /隔離/);
  assert.match(ja.machineQuarantineTitle, /隔離/);
  assert.match(ja.machineScope, /[\u3040-\u30ff\u4e00-\u9fff]/);
  assert.notEqual(ja.machineQuarantineEmpty, en.machineQuarantineEmpty);
  assert.notEqual(ja.machineAskTitle, en.machineAskTitle);
  assert.equal(t("ja", "machineQuarantineEmpty"), ja.machineQuarantineEmpty);
});
