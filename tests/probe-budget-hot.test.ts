import test from "node:test";
import assert from "node:assert/strict";
import {
  getConfiguredProbeTimeoutMs,
  setRuntimeProbeTimeoutMs
} from "../security/probe-budget";

test("runtime probe timeout override is hot-read without process restart", () => {
  const prev = getConfiguredProbeTimeoutMs();
  setRuntimeProbeTimeoutMs(7777);
  assert.equal(getConfiguredProbeTimeoutMs(), 7777);
  setRuntimeProbeTimeoutMs(null);
  assert.equal(getConfiguredProbeTimeoutMs(), prev);
});