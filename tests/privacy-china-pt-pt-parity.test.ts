/**
 * Workers privacy China section surfaces for all locales (incl. pt-PT).
 * Keep title/body present in messages.ts + _pt-PT.snapshot.json.
 *
 *   npx tsx --test tests/privacy-china-pt-pt-parity.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("PrivacyPanel always renders privacy-china-notice (locale-agnostic)", () => {
  const src = readFileSync("components/PrivacyPanel.tsx", "utf8");
  assert.match(src, /data-testid="privacy-china-notice"/);
  assert.match(src, /privacyPolicyChinaTitle/);
  assert.match(src, /privacyPolicyChinaBody/);
});

test("pt-PT messages expose China title/body (parity with EN keys)", () => {
  const messages = readFileSync("i18n/messages.ts", "utf8");
  assert.match(messages, /privacyPolicyChinaTitle:\s*"Entrada da China continental/);
  assert.match(
    messages,
    /privacyPolicyChinaBody:\s*\n\s*"Desde 22 de novembro de 2026/,
  );
});

test("_pt-PT.snapshot.json keeps China keys in sync with messages", () => {
  const snap = JSON.parse(readFileSync("i18n/packs/_pt-PT.snapshot.json", "utf8"));
  assert.equal(
    snap.privacyPolicyChinaTitle,
    "Entrada da China continental (GitHub Pages)",
  );
  assert.match(String(snap.privacyPolicyChinaBody), /otas0\.github\.io\/buusdocst/);
  assert.match(String(snap.privacyPolicyChinaBody), /aviso bilingue|encaminha automaticamente/i);
});
