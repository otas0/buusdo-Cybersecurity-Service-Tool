/**
 * Europe Privacy FAQ titles stay native + question-form (no EN stubs).
 *
 *   npx tsx --test tests/eu-faq-question-form.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const en = JSON.parse(readFileSync(path.join("i18n/packs/_en.snapshot.json"), "utf8")) as Record<
  string,
  string
>;

const LOCALES = [
  "ca",
  "ga",
  "mt",
  "uk",
  "is",
  "sl",
  "el",
  "bg",
  "cs",
  "sk",
  "hu",
  "ro",
  "hr",
  "lt",
  "lv",
  "et",
  "it",
  "nl",
  "pl",
  "sv",
  "da",
  "fi",
  "nb",
  "fr",
  "es",
  "de"
] as const;

const FAQ_KEYS = ["faqNoWipeTitle", "faqNoAvTitle", "faqNoCrowdTitle"] as const;

for (const id of LOCALES) {
  test(`${id} FAQ titles are native questions (not EN stubs)`, () => {
    const pack = JSON.parse(readFileSync(path.join("i18n/packs", `${id}.json`), "utf8")) as Record<
      string,
      string
    >;
    for (const key of FAQ_KEYS) {
      const val = pack[key]?.trim() || "";
      assert.ok(val, `${id}.${key} empty`);
      assert.notEqual(val, en[key], `${id}.${key} still EN`);
      // Greek uses ';' as the interrogative mark.
      assert.match(val, /[?？;]/, `${id}.${key} should be question-form`);
    }
  });
}
