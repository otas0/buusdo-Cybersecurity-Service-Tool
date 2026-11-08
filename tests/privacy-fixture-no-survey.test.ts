/**
 * Local-only: privacy surfaces must not link /survey/ (no Workers dependency).
 *
 *   npx tsx --test tests/privacy-fixture-no-survey.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { getMessages } from "../i18n/messages";

const root = process.cwd();
const SURVEY = /\/survey\//i;

test("local privacy HTML fixture has zero /survey/ links", () => {
  const html = readFileSync(path.join(root, "tests/fixtures/privacy-no-survey.html"), "utf8");
  assert.match(html, /data-testid="privacy-policy"/);
  assert.doesNotMatch(html, SURVEY);
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length >= 2, "fixture should include nav links");
  for (const href of hrefs) {
    assert.doesNotMatch(href, SURVEY, `fixture href ${href}`);
  }
});

test("PrivacyPanel source has zero /survey/ hrefs", () => {
  const src = readFileSync(path.join(root, "components/PrivacyPanel.tsx"), "utf8");
  assert.doesNotMatch(src, SURVEY);
  assert.doesNotMatch(src, /survey-round2/i);
});

test("EN / pt-PT / zh-Hans privacy message bodies never mention /survey/", () => {
  for (const locale of ["en", "pt-PT", "zh-Hans"] as const) {
    const t = getMessages(locale);
    const blob = [
      t.privacyPolicyIntro,
      t.privacyPolicyWhatBody,
      t.privacyPolicyStoreBody,
      t.privacyPolicyAccountBody,
      t.privacyPolicyContactBody,
      t.privacyPolicyLimitsBody,
      t.privacyPolicyUpdated,
      t.faqParentsIntro,
      t.faqNoWipeBody,
      t.faqNoAvBody,
      t.faqNoCrowdBody
    ].join("\n");
    assert.doesNotMatch(blob, SURVEY, `${locale} privacy copy`);
  }
});

test("China privacy HTML mirrors have zero /survey/ links", () => {
  for (const rel of ["china-pages/privacy.html", "china-pages/privacy-en.html"]) {
    const html = readFileSync(path.join(root, rel), "utf8");
    assert.doesNotMatch(html, SURVEY, rel);
    assert.doesNotMatch(html, /survey-round2/i, rel);
  }
});
