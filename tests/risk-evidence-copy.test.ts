import assert from "node:assert/strict";
import { test } from "node:test";
import { getMessages } from "../i18n/messages";
import {
  evidencePairFromBag,
  recommendationCopy,
  riskLevelCopy
} from "../components/risk-evidence-copy";

test("zh-Hans Halt evidence strings are Chinese (not EN fallback)", () => {
  const zh = getMessages("zh-Hans");
  const pair = evidencePairFromBag(zh, "known-threat");
  assert.ok(pair);
  assert.match(pair[0], /威胁|已知/);
  assert.match(pair[1], /列表|清单|威胁/);
  assert.notEqual(pair[0], getMessages("en").evidenceKnownThreatTitle);

  const level = riskLevelCopy(zh, "CRITICAL");
  assert.ok(level);
  assert.match(level.label, /危|停|严重/);
  assert.notEqual(level.label, getMessages("en").riskLevelCritical);

  const rec = recommendationCopy(zh, "LEAVE_AND_BLOCK");
  assert.match(rec, /离开|阻止|拦截|离开并/);
});

test("en evidencePairFromBag fills org/domain vars", () => {
  const en = getMessages("en");
  const pair = evidencePairFromBag(en, "identity-match", {
    org: "Example Bank",
    domain: "example.com"
  });
  assert.ok(pair);
  assert.ok(pair[0].length > 0);
  assert.ok(pair[1].length > 0);
});
