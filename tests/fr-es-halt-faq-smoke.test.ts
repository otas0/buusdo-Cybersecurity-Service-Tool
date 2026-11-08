/**
 * FR/ES Halt + FAQ chrome for EU soft-live readiness (pack-level).
 *
 *   npx tsx --test tests/fr-es-halt-faq-smoke.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { getMessages } from "../i18n/messages";

for (const id of ["fr", "es"] as const) {
  test(`${id} Halt evidence + FAQ commercial chrome`, () => {
    const pack = JSON.parse(readFileSync(path.join("i18n/packs", `${id}.json`), "utf8")) as Record<
      string,
      string
    >;
    const en = getMessages("en");
    assert.notEqual(pack.evidenceKnownThreatTitle, en.evidenceKnownThreatTitle);
    assert.notEqual(pack.faqCommonTitle, en.faqCommonTitle);
    assert.notEqual(pack.faqCommonIntro, en.faqCommonIntro);
    assert.match(pack.faqNoWipeTitle, /\?$/);
    assert.match(pack.faqNoAvTitle, /\?$/);
    assert.doesNotMatch(pack.faqCommonTitle, /parents|enseignants|padres|docentes/i);
    assert.doesNotMatch(pack.faqCommonIntro, /élève|enfant|alumno|niño/i);
  });
}
