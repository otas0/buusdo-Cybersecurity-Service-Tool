/**
 *   npx tsx --test tests/live-origin-resolve.test.ts
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { liveOriginCandidates, healthTimeoutMs, localeTimeoutMs, formatProbeTable } from "../scripts/lib/live-origin.mjs";

test("liveOriginCandidates prefers LIVE then PROD then STAGING then PREVIEW", () => {
  const prev = { ...process.env };
  try {
    process.env.PLAYWRIGHT_LIVE_BASE_URL = "https://live.example/";
    process.env.PRODUCTION_HEALTH_URL = "https://prod.example";
    process.env.STAGING_HEALTH_URL = "https://staging.example";
    process.env.PLAYWRIGHT_PREVIEW_BASE_URL = "https://preview.example";
    assert.deepEqual(liveOriginCandidates(), [
      "https://live.example",
      "https://prod.example",
      "https://staging.example",
      "https://preview.example"
    ]);
  } finally {
    for (const k of Object.keys(process.env)) {
      if (!(k in prev)) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }
});

test("health and locale timeouts are independent defaults", () => {
  delete process.env.HEALTH_TIMEOUT_MS;
  delete process.env.LOCALE_TIMEOUT_MS;
  assert.equal(healthTimeoutMs(), 8000);
  assert.equal(localeTimeoutMs(), 12000);
});

test("formatProbeTable includes curl-w columns", () => {
  const md = formatProbeTable([
    { url: "https://x/api/health", http_code: "000", time_total: "8.001", err: "timeout", ok: false }
  ]);
  assert.match(md, /http_code/);
  assert.match(md, /000/);
  assert.match(md, /timeout/);
});
