/**
 * Afrikaans FAQ wave matches nso/st/tn/zu semantics (question-style wipe/AV/crowd).
 *
 *   npx tsx --test tests/af-faq-wave.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { getMessages } from "../i18n/messages";

test("af FAQ strings match SA wave semantics (not legacy short titles)", () => {
  const pack = JSON.parse(readFileSync(path.join("i18n/packs/af.json"), "utf8")) as Record<
    string,
    string
  >;
  const en = getMessages("en");
  assert.match(pack.faqNoWipeTitle, /\?$/);
  assert.match(pack.faqNoAvTitle, /\?$/);
  assert.match(pack.faqNoCrowdTitle, /\?$/);
  assert.notEqual(pack.faqNoWipeTitle, "Geen outomatiese wis nie");
  assert.notEqual(pack.faqNoWipeBody, en.faqNoWipeBody);
  assert.notEqual(pack.faqNoAvBody, en.faqNoAvBody);
  assert.notEqual(pack.faqNoCrowdBody, en.faqNoCrowdBody);
  assert.match(pack.faqParentsIntro, /Halt|leerling|kind/i);
});
