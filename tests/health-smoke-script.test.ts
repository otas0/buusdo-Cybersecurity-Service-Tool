import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const script = join(process.cwd(), "scripts", "health-smoke.mjs");

test("health-smoke.mjs documents --url and required assertions", () => {
  const src = readFileSync(script, "utf8");
  assert.match(src, /--url/);
  assert.match(src, /curatedListPresent/);
  assert.match(src, /localeCount/);
  assert.match(src, /localeCount < 40|localeCount must be a number ≥ 40/);
  assert.match(src, /localesByRegion\.europe/);
  assert.match(src, /expectedRegions/);
  assert.match(src, /southeast-asia/);
  assert.match(src, /europe < 20|europe must be ≥ 20/);
  assert.match(src, /thirdPartyReputation/);
  assert.match(src, /accountSyncEnabled/);
});

test("check-smoke.mjs asserts POST /api/check timing", () => {
  const src = readFileSync(join(process.cwd(), "scripts", "check-smoke.mjs"), "utf8");
  assert.match(src, /\/api\/check/);
  assert.match(src, /ambiguousProbeStatus/);
  assert.match(src, /totalMs/);
});

test("health-smoke fails fast against closed local port", () => {
  const res = spawnSync(
    process.execPath,
    [script, "--url", "http://127.0.0.1:9"],
    {
      encoding: "utf8",
      env: { ...process.env, HEALTH_SMOKE_TIMEOUT_MS: "1500" }
    }
  );
  assert.notEqual(res.status, 0);
  assert.match(res.stderr || res.stdout || "", /FAIL|unreachable/i);
});