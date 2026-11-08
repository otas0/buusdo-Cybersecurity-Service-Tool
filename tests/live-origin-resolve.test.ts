/**
 *   npx tsx --test tests/live-origin-resolve.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  liveOriginCandidates,
  healthTimeoutMs,
  localeTimeoutMs,
  formatProbeTable,
  mapPool
} from "../scripts/lib/live-origin.mjs";

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

test("assert-eu-locale-routes-200 documents concurrency 6 + fail artifact", () => {
  const src = readFileSync("scripts/assert-eu-locale-routes-200.mjs", "utf8");
  assert.match(src, /EU_LOCALE_CONCURRENCY/);
  assert.match(src, /mapPool/);
  assert.match(src, /EU_FAIL_ARTIFACT/);
  assert.match(src, /skipped-live/);
});

test("mapPool preserves input order under concurrency", async () => {
  const items = [10, 20, 30, 40, 50, 60, 70, 80];
  const started: number[] = [];
  const out = await mapPool(items, 3, async (n, i) => {
    started.push(i);
    await new Promise((r) => setTimeout(r, 5 + ((7 - i) % 3)));
    return n * 2;
  });
  assert.deepEqual(out, items.map((n) => n * 2));
  assert.equal(started.length, items.length);
});

test("soft-live Go button helper covers ga/mt pack labels", () => {
  const src = readFileSync("playwright/helpers/soft-live-go-button.ts", "utf8");
  assert.match(src, /SOFT_LIVE_GO_BUTTON_NAME/);
  assert.match(src, /Rith/);
  assert.match(src, /Mexxi/);
  const risk = readFileSync("playwright/risk-result-zh-hans-evidence.spec.ts", "utf8");
  assert.match(risk, /SOFT_LIVE_GO_BUTTON_NAME/);
  assert.doesNotMatch(risk, /Zaženi\|Executa\|Запустити/);
});
