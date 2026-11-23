/**
 * must-stay-full packs must ship optionalUpdateShowHint (not EN / empty).
 *
 *   node --test tests/optional-update-show-hint-must-stay-full.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const en = JSON.parse(readFileSync(path.join("i18n/packs/_en.snapshot.json"), "utf8")) as Record<
  string,
  string
>;
const mustStayRaw = JSON.parse(
  readFileSync(path.join("i18n/must-stay-full-locales.json"), "utf8")
) as string[] | { locales: string[] };
const mustStayFull = Array.isArray(mustStayRaw) ? mustStayRaw : mustStayRaw.locales;

test("must-stay-full locales: optionalUpdateShowHint differs from EN", () => {
  const enVal = en.optionalUpdateShowHint?.trim() || "";
  assert.ok(enVal, "EN optionalUpdateShowHint in _en.snapshot");
  const bad: string[] = [];
  for (const id of mustStayFull) {
    const pack = JSON.parse(readFileSync(path.join("i18n/packs", `${id}.json`), "utf8")) as Record<
      string,
      string
    >;
    const val = pack.optionalUpdateShowHint?.trim() || "";
    if (!val) {
      bad.push(`${id}:missing`);
      continue;
    }
    if (val === enVal) bad.push(`${id}:still-EN`);
  }
  assert.equal(bad.length, 0, bad.join("\n"));
});

test("core-keys lists optionalUpdateShowHint, optionalUpdateTipAvailable, honestLimitsMinSupportedNote", () => {
  const core = readFileSync(path.join("i18n/core-keys.ts"), "utf8");
  assert.match(core, /optionalUpdateShowHint/);
  assert.match(core, /optionalUpdateTipAvailable/);
  assert.match(core, /honestLimitsMinSupportedNote/);
});

test("_en.snapshot and messages.ts EN both carry optionalUpdateShowHint + tip toast", () => {
  assert.ok(en.optionalUpdateShowHint?.trim());
  assert.ok(en.optionalUpdateTipAvailable?.trim());
  const messages = readFileSync(path.join("i18n/messages.ts"), "utf8");
  assert.match(messages, /optionalUpdateShowHint:\s*"Show update tip"/);
  assert.match(messages, /optionalUpdateTipAvailable:\s*"Update tip available"/);
});

test("must-stay-full locales: optionalUpdateTipAvailable differs from EN", () => {
  const enVal = en.optionalUpdateTipAvailable?.trim() || "";
  assert.ok(enVal, "EN optionalUpdateTipAvailable in _en.snapshot");
  const bad: string[] = [];
  for (const id of mustStayFull) {
    const pack = JSON.parse(readFileSync(path.join("i18n/packs", `${id}.json`), "utf8")) as Record<
      string,
      string
    >;
    const val = pack.optionalUpdateTipAvailable?.trim() || "";
    if (!val) {
      bad.push(`${id}:missing`);
      continue;
    }
    if (val === enVal) bad.push(`${id}:still-EN`);
  }
  assert.equal(bad.length, 0, bad.join("\n"));
});

test("must-stay-full locales: honestLimitsMinSupportedNote differs from EN", () => {
  const enVal = en.honestLimitsMinSupportedNote?.trim() || "";
  assert.ok(enVal, "EN honestLimitsMinSupportedNote in _en.snapshot");
  assert.match(enVal, /\{min\}/);
  assert.match(enVal, /\{source\}/);
  const bad: string[] = [];
  for (const id of mustStayFull) {
    const pack = JSON.parse(readFileSync(path.join("i18n/packs", `${id}.json`), "utf8")) as Record<
      string,
      string
    >;
    const val = pack.honestLimitsMinSupportedNote?.trim() || "";
    if (!val) {
      bad.push(`${id}:missing`);
      continue;
    }
    if (val === enVal) bad.push(`${id}:still-EN`);
    if (!val.includes("{min}") || !val.includes("{source}")) bad.push(`${id}:placeholders`);
  }
  assert.equal(bad.length, 0, bad.join("\n"));
});
