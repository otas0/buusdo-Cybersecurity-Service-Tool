import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const script = readFileSync(path.join(root, "scripts/assert-staging-health.mjs"), "utf8");
const healthMonitor = readFileSync(
  path.join(root, ".github/workflows/health-monitor.yml"),
  "utf8"
);
const smoke = readFileSync(
  path.join(root, ".github/workflows/production-health-smoke.yml"),
  "utf8"
);

test("assert-staging-health requires sync off when URL set", () => {
  assert.match(script, /accountSyncEnabled/);
  assert.match(script, /product cancelled/);
  assert.match(script, /must stay false/);
});

test("assert-staging-health soft-exits when STAGING_HEALTH_URL unset", () => {
  assert.match(script, /STAGING_HEALTH_URL unset/);
  assert.match(script, /process\.exit\(0\)/);
});

test("Health monitor + Production health smoke both call assert-staging-health", () => {
  assert.match(healthMonitor, /assert-staging-health\.mjs/);
  assert.match(smoke, /assert-staging-health\.mjs/);
});
