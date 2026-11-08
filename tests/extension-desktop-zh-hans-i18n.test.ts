import assert from "node:assert/strict";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(".");

test("extension zh-Hans covers every EN key with non-EN chrome", async () => {
  const mod = await import(pathToFileURL(path.join(root, "extension/shared/i18n.js")).href);
  const { STRINGS, normalizeUiLang } = mod;
  assert.equal(normalizeUiLang("zh"), "zh-Hans");
  assert.equal(normalizeUiLang("zh-SG"), "zh-Hans");
  const en = STRINGS.en;
  const zh = STRINGS["zh-Hans"];
  assert.ok(zh);
  for (const key of Object.keys(en)) {
    assert.ok(zh[key]?.toString().trim(), `extension zh-Hans missing ${key}`);
  }
  assert.notEqual(zh.scan, en.scan);
  assert.notEqual(zh.listsTitle, en.listsTitle);
});

test("desktop zh-Hans covers every EN key including machine-scan / lists", async () => {
  const mod = await import(pathToFileURL(path.join(root, "desktop-app/public/js/i18n.js")).href);
  const { STRINGS, normalizeUiLang } = mod;
  assert.equal(normalizeUiLang("zh-CN"), "zh-Hans");
  const en = STRINGS.en;
  const zh = STRINGS["zh-Hans"];
  assert.ok(zh);
  for (const key of Object.keys(en)) {
    assert.ok(zh[key]?.toString().trim(), `desktop zh-Hans missing ${key}`);
  }
  assert.notEqual(zh.pathScanMachine, en.pathScanMachine);
  assert.notEqual(zh.listsTitle, en.listsTitle);
  assert.notEqual(zh.machineBlockMax || zh.machineBlockAll, en.machineBlockMax || en.machineBlockAll);
  assert.match(zh.ignoreRiskBody, /密码|支付/);
});
