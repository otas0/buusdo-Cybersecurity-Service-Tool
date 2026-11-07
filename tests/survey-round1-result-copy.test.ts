import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getMessages } from "../i18n/messages";

const SURVEY_KEYS = [
  "dangerLevelLabel",
  "ignoreRiskTitle",
  "ignoreRiskBody",
  "nextStepsTitle",
  "nextStepLeave",
  "nextStepNoCredentials",
  "nextStepVerifyOfficial",
  "nextStepReport",
  "nextStepBlock",
  "nextStepLooksReal",
  "honestLimitsTitle",
  "honestLimitNoWipe",
  "honestLimitNoCrowd",
  "honestLimitNoAv",
  "actionSensitiveNote",
  "feedbackReportHaltCta"
] as const;

test("First Round survey copy keys exist in EN and pt-PT", () => {
  const en = getMessages("en");
  const pt = getMessages("pt-PT");
  for (const key of SURVEY_KEYS) {
    assert.ok(en[key]?.trim(), `en missing ${key}`);
    assert.ok(pt[key]?.trim(), `pt-PT missing ${key}`);
  }
  assert.match(en.feedbackReport, /report this website/i);
  assert.match(pt.feedbackReport, /denunciar este site/i);
  assert.match(en.honestLimitNoWipe, /cannot erase/i);
  assert.match(pt.nextStepsTitle, /passo a passo/i);
});

test("RiskResult surfaces survey-driven sections and report CTA", () => {
  const src = readFileSync(join(process.cwd(), "components/RiskResult.tsx"), "utf8");
  assert.match(src, /data-testid="result-danger-level"/);
  assert.match(src, /data-testid="result-ignore-risk"/);
  assert.match(src, /data-testid="result-next-steps"/);
  assert.match(src, /data-testid="result-honest-limits"/);
  assert.match(src, /data-testid="result-report-website"/);
  assert.match(src, /t\.feedbackReportHaltCta/);
  assert.match(src, /t\.nextStepsTitle/);
  assert.match(src, /t\.honestLimitNoCrowd/);
});
