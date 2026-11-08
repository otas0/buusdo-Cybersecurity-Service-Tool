/**
 * After choosing zh-Hant in the extension popup, core UI keys must resolve from the Hant bag.
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
  assert.equal(normalizeUiLang("zh-Hant"), "zh-Hant");
  assert.ok(STRINGS["zh-Hant"]);

  const required = [
    "appTitle",
    "scan",
    "statusStandby",
    "statusDanger",
    "statusSafe",
    "statusCaution",
    "langLabel",
    "listsTitle",
    "websiteApiLabel",
    "trackersBlocked",
    "phishingHits"
  ] as const;

  for (const key of required) {
    const hant = t("zh-Hant", key);
    assert.ok(hant && hant !== key, `zh-Hant missing ${key}`);
  }

  // Formal product name is intentionally identical across locales.
  assert.match(t("zh-Hant", "appTitle"), /buusdo Cybersecurity Service Tool/);

  // Several chrome keys must be localized (not EN).
  for (const key of ["scan", "statusStandby", "statusDanger", "statusSafe"] as const) {
    assert.notEqual(t("zh-Hant", key), t("en", key), `zh-Hant ${key} must differ from EN`);
  }

  const sample = JSON.stringify(STRINGS["zh-Hant"]);
  assert.ok(
    /關閉|清單|匯出|攔截|危險|執行|待命/.test(sample),
    "zh-Hant bag should include Traditional characters"
  );
});
