import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  getTimingSchemaFailCounters,
  recordTimingSchemaFail,
  resetTimingSchemaFailCounters
} from "../security/timing-schema-fail-counters";

test("recordTimingSchemaFail increments absent vs boolean counters", () => {
  resetTimingSchemaFailCounters();
  recordTimingSchemaFail("absent");
  recordTimingSchemaFail("absent");
  recordTimingSchemaFail(false);
  recordTimingSchemaFail(true);
  const c = getTimingSchemaFailCounters();
  assert.equal(c.ambiguousAbsent, 2);
  assert.equal(c.ambiguousBoolean, 2);
});

test("api/check logs timing-schema-fail-count without URL", () => {
  const src = readFileSync(join(process.cwd(), "app/api/check/route.ts"), "utf8");
  assert.match(src, /recordTimingSchemaFail/);
  assert.match(src, /timing-schema-fail-count absent=/);
  assert.match(src, /Fixed strings only — never URL/);
  assert.doesNotMatch(src, /timing-schema-fail-count.*\$\{.*url/i);
});

test("desktop README links Operators FAQ probe-blocked", () => {
  const readme = readFileSync(join(process.cwd(), "desktop-app/README.md"), "utf8");
  assert.match(readme, /operators-faq--probe-blocked-vs-phishing/);
});

test("extension API_CHECK_CONTRACT keeps timingSchemaFailCounts health example in lockstep", () => {
  const ext = readFileSync(join(process.cwd(), "extension/shared/API_CHECK_CONTRACT.md"), "utf8");
  const docs = readFileSync(join(process.cwd(), "docs/API_CHECK_CONTRACT.md"), "utf8");
  assert.match(docs, /timingSchemaFailCounts/);
  assert.match(ext, /timingSchemaFailCounts/);
  assert.match(ext, /CHECK_TIMING_SCHEMA_FAIL_HEALTH/);
  assert.match(ext, /ambiguousAbsent/);
  assert.match(ext, /ambiguousBoolean/);
});

test("API_CHECK_CONTRACT notes timing-schema-fail-count log line", () => {
  const doc = readFileSync(join(process.cwd(), "docs/API_CHECK_CONTRACT.md"), "utf8");
  assert.match(doc, /timing-schema-fail-count absent=/);
  assert.match(doc, /CHECK_TIMING_SCHEMA_FAIL_HEALTH/);
  assert.match(doc, /\.env\.example/);
});

test("OpenAPI documents optional timingSchemaFailCounts on health", () => {
  const yaml = readFileSync(join(process.cwd(), "docs/openapi-check-timing.yaml"), "utf8");
  assert.match(yaml, /timingSchemaFailCounts:/);
  assert.match(yaml, /CHECK_TIMING_SCHEMA_FAIL_HEALTH/);
  assert.match(yaml, /withTimingSchemaFailCounts/);
});

test("isTimingSchemaFailHealthEnabled is ops opt-in exact 1", async () => {
  const { isTimingSchemaFailHealthEnabled } = await import("../security/timing-schema-fail-counters");
  assert.equal(isTimingSchemaFailHealthEnabled({} as unknown as NodeJS.ProcessEnv), false);
  assert.equal(
    isTimingSchemaFailHealthEnabled({
      CHECK_TIMING_SCHEMA_FAIL_HEALTH: "0"
    } as unknown as NodeJS.ProcessEnv),
    false
  );
  assert.equal(
    isTimingSchemaFailHealthEnabled({
      CHECK_TIMING_SCHEMA_FAIL_HEALTH: "1"
    } as unknown as NodeJS.ProcessEnv),
    true
  );
});