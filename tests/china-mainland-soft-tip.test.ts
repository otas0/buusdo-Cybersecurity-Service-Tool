/**
 * SoftTip client redirect stays disabled / unused in layout (2026-11-28).
 *
 *   npx tsx --test tests/china-mainland-soft-tip.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("ChinaMainlandSoftTip is no-op (no client redirect)", () => {
  const src = readFileSync("components/ChinaMainlandSoftTip.tsx", "utf8");
  assert.doesNotMatch(src, /location\.replace\s*\(/);
  assert.doesNotMatch(src, /\/api\/geo/);
  assert.match(src, /return null/);
});

test("layout does not mount SoftTip", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");
  assert.doesNotMatch(layout, /ChinaMainlandSoftTip/);
});

test("geo API advertises empty forceRedirectCountries", () => {
  const src = readFileSync("app/api/geo/route.ts", "utf8");
  assert.match(src, /forceRedirectCountries:\s*\[\]/);
  assert.match(src, /forceRedirect:\s*false/);
});
