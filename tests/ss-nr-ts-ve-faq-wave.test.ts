/**
 * ss/nr/ts/ve FAQ wave matches af/nso question-style.
 *
 *   npx tsx --test tests/ss-nr-ts-ve-faq-wave.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { getMessages } from "../i18n/messages";

for (const id of ["ss", "nr", "ts", "ve"] as const) {
  test(`${id} FAQ strings match SA question-style wave`, () => {
    const pack = JSON.parse(readFileSync(path.join("i18n/packs", `${id}.json`), "utf8")) as Record<
      string,
      string
    >;
    const en = getMessages("en");
    assert.match(pack.faqNoWipeTitle, /\?$/);
    assert.match(pack.faqNoAvTitle, /\?$/);
    assert.match(pack.faqNoCrowdTitle, /\?$/);
    assert.notEqual(pack.faqNoWipeBody, en.faqNoWipeBody);
    assert.notEqual(pack.faqNoAvBody, en.faqNoAvBody);
    assert.notEqual(pack.faqNoCrowdBody, en.faqNoCrowdBody);
    assert.ok(pack.faqCommonIntro?.length > 40);
  });
}
