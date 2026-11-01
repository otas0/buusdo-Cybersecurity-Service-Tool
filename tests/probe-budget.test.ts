import test from "node:test";
import assert from "node:assert/strict";
import { maxProbeAmongTimeouts, suggestProbeTimeoutMs } from "../security/probe-budget-suggest";

test("suggestProbeTimeoutMs raises by about 20% over observed max", () => {
  const result = suggestProbeTimeoutMs(5000, 5000);
  assert.equal(result.maxObservedMs, 5000);
  assert.equal(result.suggestedMs, 6000);
  assert.equal(result.shouldRaise, true);
});

test("suggestProbeTimeoutMs keeps current when no timeouts observed", () => {
  const result = suggestProbeTimeoutMs(5000, null);
  assert.equal(result.suggestedMs, 5000);
  assert.equal(result.shouldRaise, false);
});

test("maxProbeAmongTimeouts ignores hosts without timeouts", () => {
  assert.equal(
    maxProbeAmongTimeouts([
      { timeouts: 0, maxProbeMs: 9000 },
      { timeouts: 2, maxProbeMs: 4800 },
      { timeouts: 1, maxProbeMs: 5000 }
    ]),
    5000
  );
});