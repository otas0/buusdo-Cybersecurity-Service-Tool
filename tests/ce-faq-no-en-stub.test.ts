/**
 * CE/SE FAQ bodies must not equal current EN (no leftover English stubs).
 *
 *   npx tsx --test tests/ce-faq-no-en-stub.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const FAQ_KEYS = [
  "faqNoWipeTitle",
  "faqNoWipeBody",
  "faqNoAvTitle",
  "faqNoAvBody",
  "faqNoCrowdTitle",
  "faqNoCrowdBody",
  "faqCommonTitle",
  "faqCommonIntro"
] as const;

const LOCALES = [
  "cs",
  "sk",
  "hu",
  "ro",
  "bg",
  "el",
  "hr",
  "lt",
  "lv",
  "et",
  "sl",
  "ca",
  "ga",
  "mt",
  "uk",
  "is"
] as const;

test("CE/SE/Baltic FAQ chrome differs from EN snapshot", () => {
  const en = JSON.parse(
    readFileSync(path.join("i18n/packs/_en.snapshot.json"), "utf8")
  ) as Record<string, string>;
  const bad: string[] = [];
  for (const id of LOCALES) {
    const pack = JSON.parse(
      readFileSync(path.join("i18n/packs", `${id}.json`), "utf8")
    ) as Record<string, string>;
    for (const key of FAQ_KEYS) {
      if (!pack[key]?.trim()) {
        bad.push(`${id}:${key}:missing`);
        continue;
      }
      if (pack[key] === en[key]) bad.push(`${id}:${key}:same-as-en`);
    }
  }
  assert.equal(bad.length, 0, bad.slice(0, 20).join("\n"));
});
