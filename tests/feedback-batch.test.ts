import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRiskNotes,
  draftsToThreatBatch,
  removeDraft,
  suggestedBatchFilename,
  summarizeExportPlan,
  upsertDraft,
  type FeedbackDraft
} from "../security/feedback-batch";

test("upsertDraft replaces same domain+mark", () => {
  const first: FeedbackDraft = { at: "a", domain: "bad.example", level: "CAUTION", mark: "report" };
  const second: FeedbackDraft = { at: "b", domain: "bad.example", level: "HIGH", mark: "report" };
  const list = upsertDraft(upsertDraft([], first), second);
  assert.equal(list.length, 1);
  assert.equal(list[0].level, "HIGH");
});

test("draftsToThreatBatch leaves reviewedBy empty and checklist unchecked", () => {
  const batch = draftsToThreatBatch([
    { at: "1", domain: "missed.example", level: "LOW_EVIDENCE", mark: "report" },
    { at: "2", domain: "wrong.example", level: "HIGH", mark: "false-positive" }
  ]);
  assert.equal(batch.kind, "mixed");
  assert.equal(batch.reviewedBy, "");
  assert.equal(batch.reviewChecklist?.readyToApply, false);
  assert.equal(batch.reviewChecklist?.hostsReviewed, false);
  assert.equal(batch.add?.length, 1);
  assert.equal(batch.add?.[0].host, "missed.example");
  assert.equal(batch.remove?.[0].host, "wrong.example");
  assert.match(batch.notes || "", /Hosts to write: 2/);
  assert.match(batch.notes || "", /LOW_EVIDENCE×1/);
  assert.match(batch.notes || "", /HIGH×1/);
  assert.match(suggestedBatchFilename(batch), /\.json$/);
});

test("draftsToThreatBatch writes UI checklist flags into JSON", () => {
  const batch = draftsToThreatBatch(
    [{ at: "1", domain: "missed.example", level: "CAUTION", mark: "report" }],
    {
      reviewedBy: "ops",
      reviewChecklist: { hostsReviewed: true, falsePositivesConfirmed: true, readyToApply: true }
    }
  );
  assert.equal(batch.reviewedBy, "ops");
  assert.equal(batch.reviewChecklist?.hostsReviewed, true);
  assert.equal(batch.reviewChecklist?.falsePositivesConfirmed, true);
  assert.equal(batch.reviewChecklist?.readyToApply, true);
});

test("summarizeExportPlan counts unique hosts per mark", () => {
  const plan = summarizeExportPlan([
    { at: "1", domain: "a.example", level: "CAUTION", mark: "report" },
    { at: "2", domain: "a.example", level: "HIGH", mark: "report" },
    { at: "3", domain: "b.example", level: "CRITICAL", mark: "false-positive" }
  ]);
  assert.equal(plan.addCount, 1);
  assert.equal(plan.removeCount, 1);
  assert.equal(plan.hostCount, 2);
  assert.equal(plan.reportLevels.HIGH, 1);
});

test("buildRiskNotes includes level summary", () => {
  const notes = buildRiskNotes([{ at: "1", domain: "x.example", level: "CAUTION", mark: "report" }]);
  assert.match(notes, /CAUTION×1/);
  assert.match(notes, /reviewChecklist/);
});

test("removeDraft drops one mark only", () => {
  const list: FeedbackDraft[] = [
    { at: "1", domain: "x.example", level: "CAUTION", mark: "report" },
    { at: "2", domain: "x.example", level: "CAUTION", mark: "false-positive" }
  ];
  const next = removeDraft(list, "x.example", "report");
  assert.equal(next.length, 1);
  assert.equal(next[0].mark, "false-positive");
});