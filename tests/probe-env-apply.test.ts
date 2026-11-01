import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { applyProbeEnvUpdates } from "../security/probe-env-apply";
import { upsertEnvLocalLine } from "../security/env-local-write";
import { setRuntimeOwnThreatMergePt } from "../security/env-local";

test("applyProbeEnvUpdates EPERM writeLine still hot-applies MERGE_PT", () => {
  setRuntimeOwnThreatMergePt(null);
  const result = applyProbeEnvUpdates({ ownThreatMergePt: false }, () => {
    throw new Error("operation not permitted");
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.fileWriteDenied, true);
  assert.equal(result.path, null);
  assert.equal(result.usedFallbackPath, undefined);
  assert.equal(result.ownThreatMergePt, false);
  assert.ok(result.lines.some((l) => l.includes("OWN_THREAT_MERGE_PT=0")));
  setRuntimeOwnThreatMergePt(null);
});

test("applyProbeEnvUpdates returns usedFallbackPath for operators", () => {
  setRuntimeOwnThreatMergePt(null);
  const result = applyProbeEnvUpdates({ ownThreatMergePt: true }, () => ({
    path: "security/data/runtime/env-overrides.env",
    line: "OWN_THREAT_MERGE_PT=1",
    usedFallback: true
  }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.fileWriteDenied, true);
  assert.equal(result.usedFallbackPath, "security/data/runtime/env-overrides.env");
  assert.equal(result.ownThreatMergePt, true);
  setRuntimeOwnThreatMergePt(null);
});

test("upsertEnvLocalLine falls back to runtime file when primary path denied", () => {
  const dir = mkdtempSync(join(tmpdir(), "shield-env-"));
  // Parent is a file → mkdir/write on primary fails → fallback.
  const blocker = join(dir, "blocker");
  writeFileSync(blocker, "not-a-dir\n");
  const badPrimary = join(blocker, ".env.local");
  const fallback = join(dir, "runtime", "env-overrides.env");
  mkdirSync(join(dir, "runtime"), { recursive: true });
  const written = upsertEnvLocalLine("OWN_THREAT_MERGE_PT", "0", {
    primaryPath: badPrimary,
    fallbackPath: fallback
  });
  assert.equal(written.usedFallback, true);
  assert.match(readFileSync(fallback, "utf8"), /OWN_THREAT_MERGE_PT=0/);
});