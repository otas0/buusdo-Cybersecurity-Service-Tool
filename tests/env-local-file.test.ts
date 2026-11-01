import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readEnvLocalValue } from "../security/env-local-file";
import { RUNTIME_ENV_OVERRIDES_REL } from "../security/env-local-write";

test("readEnvLocalValue prefers .env.local over runtime fallback", () => {
  const dir = mkdtempSync(join(tmpdir(), "shield-env-read-"));
  writeFileSync(join(dir, ".env.local"), "OWN_THREAT_MERGE_PT=1\n");
  mkdirSync(join(dir, "security/data/runtime"), { recursive: true });
  writeFileSync(join(dir, RUNTIME_ENV_OVERRIDES_REL), "OWN_THREAT_MERGE_PT=0\n");
  assert.equal(readEnvLocalValue("OWN_THREAT_MERGE_PT", dir), "1");
});

test("readEnvLocalValue uses runtime fallback when .env.local missing", () => {
  const dir = mkdtempSync(join(tmpdir(), "shield-env-fb-"));
  mkdirSync(join(dir, "security/data/runtime"), { recursive: true });
  writeFileSync(join(dir, RUNTIME_ENV_OVERRIDES_REL), "OWN_THREAT_MERGE_PT=0\n");
  assert.equal(readEnvLocalValue("OWN_THREAT_MERGE_PT", dir), "0");
});