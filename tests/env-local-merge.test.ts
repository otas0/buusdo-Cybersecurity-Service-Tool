import test from "node:test";
import assert from "node:assert/strict";
import { isOwnThreatMergePtEnabled, setRuntimeOwnThreatMergePt } from "../security/env-local";

test("runtime OWN_THREAT_MERGE_PT override wins for hot-read", () => {
  setRuntimeOwnThreatMergePt("0");
  assert.equal(isOwnThreatMergePtEnabled(), false);
  setRuntimeOwnThreatMergePt("1");
  assert.equal(isOwnThreatMergePtEnabled(), true);
  setRuntimeOwnThreatMergePt(null);
});