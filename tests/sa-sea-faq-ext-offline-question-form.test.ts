/**
 * Southern Africa + Southeast Asia: Privacy FAQ titles/bodies are native (not EN).
 *
 *   npx tsx --test tests/sa-sea-faq-ext-offline-question-form.test.ts
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
  // southern-africa
  "af",
  "zu",
  "xh",
  "nso",
  "st",
  "tn",
  "ss",
  "ve",
  "ts",
  "nr",
  // southeast-asia
  "id",
  "ms",
  "th",
  "vi",
  "fil",
  "km",
  "lo",
  "my"
] as const;

const FAQ_TITLE_KEYS = [
  "faqNoWipeTitle",
  "faqNoAvTitle",
  "faqNoCrowdTitle",
  "faqExtOfflineTitle"
] as const;

/** Latin ? / CJK ？ / Greek ; / Thai ไหม|หรือไม่ */
function isQuestionForm(val: string): boolean {
  return /[?？;]|ไหม|หรือไม่/.test(val);
}

for (const id of LOCALES) {
  for (const key of FAQ_TITLE_KEYS) {
    test(`${id} ${key} is native question-form (not EN stub)`, () => {
      const pack = JSON.parse(readFileSync(path.join("i18n/packs", `${id}.json`), "utf8")) as Record<
        string,
        string
      >;
      const val = pack[key]?.trim() || "";
      assert.ok(val, `${id}.${key} empty`);
      assert.notEqual(val, en[key], `${id}.${key} still EN`);
      assert.ok(isQuestionForm(val), `${id}.${key} should be question-form`);
    });
  }

  test(`${id} faqExtOfflineBody is native (not EN stub)`, () => {
    const pack = JSON.parse(readFileSync(path.join("i18n/packs", `${id}.json`), "utf8")) as Record<
      string,
      string
    >;
    const val = pack.faqExtOfflineBody?.trim() || "";
    assert.ok(val, `${id}.faqExtOfflineBody empty`);
    assert.notEqual(val, en.faqExtOfflineBody, `${id}.faqExtOfflineBody still EN`);
  });
}
