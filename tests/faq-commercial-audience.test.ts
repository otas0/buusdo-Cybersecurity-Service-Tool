/**
 * FAQ chrome is general-audience commercial copy — not parents/teachers framing.
 *
 *   npx tsx --test tests/faq-commercial-audience.test.ts
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { getMessages } from "../i18n/messages";

const FORBIDDEN =
  /parents and teachers|for parents|pais e professores|家长|教师|student or child|ask a student|élève|alumno o un niño|leerling|kind|foresatte|vanhemmille|genitori e insegnanti|ouders en leraren|rodziców i nauczycieli|padres y docentes|parents et enseignants|Kubazali|phụ huynh|ผู้ปกครองและครู|parents \/ teachers|家长 \/ 教师/i;

test("EN/pt-PT FAQ titles are commercial common-questions framing", () => {
  const en = getMessages("en");
  const pt = getMessages("pt-PT");
  assert.equal(en.faqCommonTitle, "Common questions");
  assert.match(en.faqCommonIntro, /buusdo/i);
  assert.doesNotMatch(en.faqCommonTitle, FORBIDDEN);
  assert.doesNotMatch(en.faqCommonIntro, FORBIDDEN);
  assert.equal(pt.faqCommonTitle, "Perguntas frequentes");
  assert.doesNotMatch(pt.faqCommonTitle, FORBIDDEN);
  assert.doesNotMatch(pt.faqCommonIntro, FORBIDDEN);
});

test("every locale pack FAQ chrome drops parents/teachers audience framing", () => {
  const packsDir = path.join("i18n/packs");
  const files = readdirSync(packsDir).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  const bad: string[] = [];
  for (const file of files) {
    const pack = JSON.parse(readFileSync(path.join(packsDir, file), "utf8")) as Record<
      string,
      string
    >;
    for (const key of ["faqCommonTitle", "faqCommonIntro"] as const) {
      const val = pack[key];
      if (!val?.trim()) continue;
      if (FORBIDDEN.test(val)) bad.push(`${file}:${key}:${val.slice(0, 80)}`);
    }
  }
  assert.equal(bad.length, 0, bad.slice(0, 12).join("\n"));
});
