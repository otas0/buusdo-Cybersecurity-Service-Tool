/**
 * After choosing zh-Hant in the extension popup, core UI keys must be Traditional (not EN).
 *
 *   npx tsx --test tests/extension-popup-zh-hant-strings.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("popup.html exposes zh-Hant under East Asia optgroup (no Frequent UI)", () => {
  const html = readFileSync("extension/popup/popup.html", "utf8");
  assert.match(html, /data-i18n-label="langRegionEastAsia"/);
  assert.match(html, /<option value="zh-Hant">/);
  assert.match(html, /<optgroup /);
  assert.doesNotMatch(html, /Frequent|locale-frequent|常用/);
});

test("zh-Hant bag via normalizeUiLang + t() covers core popup chrome", async () => {
  const mod = await import("../extension/shared/i18n.js");
  const { normalizeUiLang, t, STRINGS } = mod as {
    normalizeUiLang: (l: string) => string;
    t: (lang: string, key: string) => string;
    STRINGS: Record<string, Record<string, string>>;
  };
  assert.equal(normalizeUiLang("zh-TW"), "zh-Hant");
  assert.equal(normalizeUiLang("zh-HK"), "zh-Hant");
  assert.ok(STRINGS["zh-Hant"]);

  assert.equal(t("zh-Hant", "langLabel"), "語言");
  assert.equal(t("zh-Hant", "listsTitle"), "個人清單");
  assert.match(t("zh-Hant", "appTitle"), /buusdo Cybersecurity Service Tool/);

  const mustDiffer = [
    "scan",
    "statusStandby",
    "statusDanger",
    "listsTitle",
    "listsExport",
    "listsImport",
    "listsHint",
    "websiteApiLabel",
    "langLabel",
    "listBlock",
    "listTrust"
  ] as const;
  for (const key of mustDiffer) {
    assert.notEqual(t("zh-Hant", key), t("en", key), `zh-Hant ${key} must differ from EN`);
  }

  // Spot-check Traditional forms (not Simplified).
  assert.match(t("zh-Hant", "langLabel"), /語/);
  assert.doesNotMatch(t("zh-Hant", "langLabel"), /检查|语言/);
  assert.match(t("zh-Hant", "listsTitle"), /清單/);
  assert.doesNotMatch(t("zh-Hant", "listsTitle"), /个人列表/);
});
