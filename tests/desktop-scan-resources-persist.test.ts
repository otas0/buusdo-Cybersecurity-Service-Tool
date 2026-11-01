import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("dashboard Scan path calls writePersistedScanResources", () => {
  const dash = readFileSync(join(process.cwd(), "desktop-app/public/js/dashboard.js"), "utf8");
  assert.match(dash, /from\s+["']\.\/scan-resources-session\.mjs["']/);
  assert.match(dash, /writePersistedScanResources/);
  assert.match(dash, /persistScanResourcesIfAllowed\s*\(/);
  // Scan handler must persist before POST /api/scan.
  const scanIdx = dash.indexOf("async function runScan");
  const persistIdx = dash.indexOf("persistScanResourcesIfAllowed()", scanIdx);
  const fetchIdx = dash.indexOf('fetch("/api/scan"', scanIdx);
  assert.ok(scanIdx >= 0 && persistIdx > scanIdx && fetchIdx > persistIdx);
});