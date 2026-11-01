import test from "node:test";
import assert from "node:assert/strict";
import { validateCheckTiming } from "../security/validate-check-timing";

const good = {
  parseMs: 0,
  threatMs: 1,
  probeMs: 120,
  riskMs: 1,
  totalMs: 122,
  probeTimeoutMs: 5000,
  probeHeadFailed: false,
  headSkipped: false,
  ambiguousProbeStatus: false
};

test("validateCheckTiming accepts schema-shaped timing", () => {
  const result = validateCheckTiming(good);
  assert.equal(result.ok, true);
});

test("validateCheckTiming rejects extra properties and bad types", () => {
  assert.equal(validateCheckTiming({ ...good, extra: 1 }).ok, false);
  assert.equal(validateCheckTiming({ ...good, probeTimeoutMs: 0 }).ok, false);
  assert.equal(validateCheckTiming({ ...good, probeMs: "x" }).ok, false);
  assert.equal(validateCheckTiming({ ...good, probeHeadFailed: "yes" }).ok, false);
  assert.equal(validateCheckTiming({ ...good, ambiguousProbeStatus: "yes" }).ok, false);
  const { ambiguousProbeStatus: _drop, ...missing } = good;
  assert.equal(validateCheckTiming(missing).ok, false);
});