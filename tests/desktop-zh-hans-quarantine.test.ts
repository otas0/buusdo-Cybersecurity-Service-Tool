import assert from "node:assert/strict";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";

test("desktop zh-Hans machineQuarantine* differs from EN", async () => {
  const mod = await import(pathToFileURL(path.resolve("desktop-app/public/js/i18n.js")).href);
  const { STRINGS, t, normalizeUiLang } = mod;
  assert.equal(normalizeUiLang("zh"), "zh-Hans");
  const en = STRINGS.en;
  const zh = STRINGS["zh-Hans"];
  assert.ok(zh.machineQuarantineTitle);
  assert.ok(zh.machineQuarantineEmpty);
  assert.notEqual(zh.machineQuarantineTitle, en.machineQuarantineTitle);
  assert.notEqual(zh.machineQuarantineEmpty, en.machineQuarantineEmpty);
  assert.match(zh.machineQuarantineTitle, /隔离|檢疫|检疫/);
  assert.equal(t("zh-Hans", "machineQuarantineEmpty"), zh.machineQuarantineEmpty);
  // Brand formal name may match EN on purpose
  assert.equal(zh.appTitle, en.appTitle);
});
