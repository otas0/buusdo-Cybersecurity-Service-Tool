import test from "node:test";
import assert from "node:assert/strict";
import {
  catalogScenarioName,
  formatDiffCell,
  loadFailedFromReport,
  resolveScenarioName
} from "../scripts/evaluation-diff-lib";

test("resolveScenarioName prefers report name then catalog", () => {
  assert.equal(resolveScenarioName("EVAL-001", "Custom label"), "Custom label");
  assert.equal(resolveScenarioName("EVAL-001"), catalogScenarioName("EVAL-001"));
  assert.match(resolveScenarioName("EVAL-001"), /Normal HTTPS/);
  assert.equal(resolveScenarioName("EVAL-DOES-NOT-EXIST"), "");
});

test("loadFailedFromReport fills nameless ids from evaluation/scenarios.ts", () => {
  const failed = loadFailedFromReport({
    scenarios: [
      { id: "EVAL-001", passed: false },
      { id: "EVAL-002", passed: true },
      { id: "EVAL-003", passed: false, name: "" }
    ]
  });
  assert.equal(failed.size, 2);
  assert.match(failed.get("EVAL-001") || "", /Normal HTTPS/);
  assert.match(failed.get("EVAL-003") || "", /Verified fictional/);
});

test("formatDiffCell includes catalog names", () => {
  const cell = formatDiffCell(["EVAL-002"], new Map());
  assert.match(cell, /EVAL-002/);
  assert.match(cell, /Normal HTTP unfamiliar domain/);
});