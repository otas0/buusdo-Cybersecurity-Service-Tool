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
const promote = readFileSync(
  path.join(root, ".github/workflows/desktop-promote-macos-url.yml"),
  "utf8"
);

test("assert-staging-health fail-closes on missing Turso flag", () => {
  assert.match(script, /accountSyncTursoConfigured/);
  assert.match(script, /accountSyncEnabled/);
  assert.match(script, /fail closed|FAIL/i);
  assert.match(script, /gate pending/);
});

test("Health monitor + Production health smoke both call assert-staging-health", () => {
  assert.match(healthMonitor, /assert-staging-health\.mjs/);
  assert.match(smoke, /assert-staging-health\.mjs/);
  assert.match(smoke, /no soft_warn/);
});

test("desktop-promote requires NOTARIZED_HEAD_OK=1 before rewrite", () => {
  assert.match(promote, /NOTARIZED_HEAD_OK=1/);
  assert.match(promote, /refuse promote/i);
});
