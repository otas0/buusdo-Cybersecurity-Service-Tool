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
  assert.match(ja.scanning, /確認|スキャン|待機|中/);
  assert.notEqual(ja.scanning, en.scanning);
  assert.notEqual(ja.detailSafe, en.detailSafe);
  assert.notEqual(ja.detailDanger, en.detailDanger);
  assert.notEqual(ja.detailCaution, en.detailCaution);
  assert.notEqual(ja.openAtLogin, en.openAtLogin);
});
