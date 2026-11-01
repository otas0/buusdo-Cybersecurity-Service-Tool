import test from "node:test";
import assert from "node:assert/strict";
import {
  USER_BLOCK_EVIDENCE_ID,
  canonicalEvidenceId,
  evidenceIncludesAll,
  personalUserBlockEvidence
} from "../security/evidence-ids";

test("sensitive aliases to sensitive-path", () => {
  assert.equal(canonicalEvidenceId("sensitive"), "sensitive-path");
  assert.equal(canonicalEvidenceId("sensitive-path"), "sensitive-path");
});

test("evidenceIncludesAll accepts legacy sensitive expected id", () => {
  assert.equal(evidenceIncludesAll(["no-match", "sensitive-path", "https-limit"], ["sensitive", "https-limit"]), true);
});

test("personalUserBlockEvidence is reserved and null unless applied", () => {
  assert.equal(personalUserBlockEvidence(false), null);
  const ev = personalUserBlockEvidence(true);
  assert.ok(ev);
  assert.equal(ev!.id, USER_BLOCK_EVIDENCE_ID);
  assert.equal(USER_BLOCK_EVIDENCE_ID, "user-block");
});