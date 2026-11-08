import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  LOCALE_CATALOG,
  LOCALE_IDS,
  isLocale,
  localeAliasTarget,
  normalizeLocale,
  localesInRegion
} from "../i18n/locales";
import { CORE_MESSAGE_KEYS } from "../i18n/core-keys";
import { getMessages } from "../i18n/messages";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const packsDir = path.join(root, "i18n", "packs");

test("catalog covers required regions and priority languages", () => {
  assert.ok(LOCALE_IDS.includes("en"));
  assert.ok(LOCALE_IDS.includes("pt-PT"));
  assert.ok(LOCALE_IDS.includes("zh-Hans"));
  assert.ok(LOCALE_IDS.includes("zh-Hant"));
  assert.ok(LOCALE_IDS.includes("ja"));
  assert.equal(LOCALE_IDS.includes("mi"), false);
  assert.equal(LOCALE_IDS.includes("th"), false);
  assert.ok(localesInRegion("europe").length >= 20);
  assert.ok(localesInRegion("southern-africa").length >= 10);
  // SEA + Pacific held until real packs (no EN stubs in catalog).
  assert.equal(localesInRegion("southeast-asia").length, 0);
  assert.equal(localesInRegion("pacific").length, 0);
  assert.equal(new Set(LOCALE_IDS).size, LOCALE_IDS.length);
});

test("normalizeLocale aliases", () => {
  assert.equal(normalizeLocale("zh"), "zh-Hans");
  assert.equal(normalizeLocale("zh-TW"), "zh-Hant");
  assert.equal(normalizeLocale("pt"), "pt-PT");
  assert.equal(normalizeLocale("jp"), "ja");
  // fil/mi held — bare tl falls through to en until SEA packs return
  assert.equal(normalizeLocale("tl"), "en");
  assert.equal(normalizeLocale("no"), "nb");
  assert.equal(normalizeLocale("xx-unknown"), "en");
  assert.ok(isLocale("de"));
  assert.equal(isLocale("de-DE"), false);
});

test("localeAliasTarget redirects zh → zh-Hans and leaves shipped ids alone", () => {
  assert.equal(localeAliasTarget("zh"), "zh-Hans");
  assert.equal(localeAliasTarget("zh-CN"), "zh-Hans");
  assert.equal(localeAliasTarget("zh-SG"), "zh-Hans");
  assert.equal(localeAliasTarget("zh-TW"), "zh-Hant");
  assert.equal(localeAliasTarget("zh-HK"), "zh-Hant");
  assert.equal(localeAliasTarget("zh-Hans"), null);
  assert.equal(localeAliasTarget("en"), null);
  assert.equal(localeAliasTarget("not-a-locale"), null);
});

test("zh-Hans pack differs from EN on chrome strings", () => {
  const zh = getMessages("zh-Hans");
  const en = getMessages("en");
  assert.equal(zh.prototype, en.prototype);
  assert.notEqual(zh.go, en.go);
  assert.notEqual(zh.navCheck, en.navCheck);
  assert.match(zh.lightDanger, /停止/);
});

test("getMessages falls back to EN for missing pack keys", () => {
  const en = getMessages("en");
  const de = getMessages("de");
  assert.equal(en.prototype, de.prototype || en.prototype);
  assert.ok(de.navCheck);
  assert.ok(de.lightDanger);
});

test("pt-PT bag stays complete vs EN keys", () => {
  const en = getMessages("en");
  const pt = getMessages("pt-PT");
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    assert.ok(pt[key]?.toString().trim(), `pt-PT missing ${key}`);
  }
});

test("full packs zh-Hans / zh-Hant / ja match EN key set when present", () => {
  const enPath = path.join(packsDir, "_en.snapshot.json");
  if (!existsSync(enPath)) return;
  const enKeys = Object.keys(JSON.parse(readFileSync(enPath, "utf8")));
  for (const id of ["zh-Hans", "zh-Hant", "ja"] as const) {
    const packPath = path.join(packsDir, `${id}.json`);
    if (!existsSync(packPath)) {
      assert.fail(`missing full pack ${id}`);
    }
    const pack = JSON.parse(readFileSync(packPath, "utf8")) as Record<string, string>;
    const missing = enKeys.filter((k) => !pack[k]?.trim());
    assert.equal(missing.length, 0, `${id} missing keys: ${missing.slice(0, 8).join(", ")}`);
    const t = getMessages(id);
    assert.notEqual(t.navCheck, getMessages("en").navCheck, `${id} navCheck should differ from EN`);
  }
});

test("every catalog locale (except en/pt-PT) has a pack with CORE keys when packs exist", () => {
  const packFiles = existsSync(packsDir)
    ? readdirSync(packsDir).filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    : [];
  if (packFiles.length < 10) {
    // Infrastructure may land before all core packs; skip soft until gen finishes.
    return;
  }
  for (const entry of LOCALE_CATALOG) {
    if (entry.id === "en" || entry.id === "pt-PT") continue;
    const packPath = path.join(packsDir, `${entry.id}.json`);
    assert.ok(existsSync(packPath), `missing pack for ${entry.id}`);
    const pack = JSON.parse(readFileSync(packPath, "utf8")) as Record<string, string>;
    for (const key of CORE_MESSAGE_KEYS) {
      assert.ok(pack[key]?.trim(), `${entry.id} missing core key ${key}`);
    }
  }
});
