import assert from "node:assert/strict";
import { test } from "node:test";
import { analyseWebsite } from "../security/analyse";
import { USER_BLOCK_EVIDENCE_ID } from "../security/evidence-ids";

test("personalListBlocked hint appends user-block evidence; website stores nothing", async () => {
  const without = await analyseWebsite("https://ordinary-garden.test/", {
    live: false,
    personalListBlocked: false
  });
  assert.equal(without.personalListBlocked, false);
  assert.ok(!without.risk.evidence.some((e) => e.id === USER_BLOCK_EVIDENCE_ID));

  const withHint = await analyseWebsite("https://ordinary-garden.test/", {
    live: false,
    personalListBlocked: true
  });
  assert.equal(withHint.personalListBlocked, true);
  assert.ok(withHint.risk.evidence.some((e) => e.id === USER_BLOCK_EVIDENCE_ID));
  assert.ok(withHint.timing.totalMs >= 0);
  assert.equal(withHint.risk.level, "LOW_EVIDENCE");
  assert.equal(withHint.risk.recommendation, "LEAVE");
  // Matrix guard: companion evidence ids (e.g. https-limit) must not drop LEAVE on LOW_EVIDENCE.
  const otherIds = withHint.risk.evidence.map((e) => e.id).filter((id) => id !== USER_BLOCK_EVIDENCE_ID);
  assert.ok(otherIds.length > 0, "expected non-user-block evidence alongside personal hint");
  assert.equal(withHint.risk.level, "LOW_EVIDENCE");
  assert.equal(withHint.risk.recommendation, "LEAVE");
});

test("personalListBlocked keeps stronger recommendation on HIGH known threat", async () => {
  const withHint = await analyseWebsite("https://malicious-demo.test/download", {
    live: false,
    personalListBlocked: true
  });
  assert.equal(withHint.personalListBlocked, true);
  assert.ok(withHint.risk.evidence.some((e) => e.id === USER_BLOCK_EVIDENCE_ID));
  assert.equal(withHint.risk.level, "HIGH");
  assert.equal(withHint.risk.recommendation, "LEAVE");
});

test("personalListBlocked keeps LEAVE_AND_BLOCK on CRITICAL", async () => {
  const withHint = await analyseWebsite("https://lusitania-bank-login.test/secure", {
    live: false,
    organisationId: "lusitania-bank",
    personalListBlocked: true
  });
  assert.ok(withHint.risk.evidence.some((e) => e.id === USER_BLOCK_EVIDENCE_ID));
  assert.equal(withHint.risk.level, "CRITICAL");
  assert.equal(withHint.risk.recommendation, "LEAVE_AND_BLOCK");
});