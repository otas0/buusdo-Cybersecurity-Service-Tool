/**
 * zh-Hant system-lang bags stay Traditional for toast/list chrome (popup follows OS).
 *
 *   npx tsx --test tests/extension-popup-zh-hant-strings.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("slim popup has no manual langSelect; catalog still lists zh-Hant", () => {
  const html = readFileSync("extension/popup/popup.html", "utf8");
  assert.doesNotMatch(html, /id="langSelect"/);
  assert.doesNotMatch(html, /Frequent|locale-frequent|常用/);
  const catalog = JSON.parse(
    readFileSync("extension/shared/extension-ui-locales.json", "utf8")
  ) as { order: string[] };
  assert.ok(catalog.order.includes("zh-Hant"));
});

test("zh-Hant bag via normalizeUiLang + t() covers core chrome", async () => {
  const mod = await import("../extension/shared/i18n.js");
  const { normalizeUiLang, t, STRINGS } = mod as {
    normalizeUiLang: (l: string) => string;
    t: (lang: string, key: string) => string;
    STRINGS: Record<string, Record<string, string>>;
  };
  assert.equal(normalizeUiLang("zh-TW"), "zh-Hant");
  assert.equal(normalizeUiLang("zh-HK"), "zh-Hant");
  assert.ok(STRINGS["zh-Hant"]);

  assert.match(t("zh-Hant", "appTitle"), /buusdo Cybersecurity Service Tool/);
  assert.equal(t("zh-Hant", "listsTitle"), "個人清單");

  const mustDiffer = [
    "statusStandby",
    "statusDanger",
    "listsTitle",
    "listBlock",
    "listTrust",
    "statusIdle"
  ] as const;
  for (const key of mustDiffer) {
    assert.notEqual(t("zh-Hant", key), t("en", key), `zh-Hant ${key} must differ from EN`);
  }

  assert.match(t("zh-Hant", "listsTitle"), /清單/);
  assert.doesNotMatch(t("zh-Hant", "listsTitle"), /个人列表/);
  assert.match(t("zh-Hant", "listBlock"), /攔截|阻挡|封鎖/);
});
