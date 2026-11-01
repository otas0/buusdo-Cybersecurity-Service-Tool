#!/usr/bin/env node
/**
 * Production POST /api/check smoke (Workers outbound fetch + probe).
 *
 *   npm run check:prod -- --url https://YOUR.workers.dev
 *   HEALTH_BASE_URL=https://… npm run check:prod
 */
const args = process.argv.slice(2);
let urlFlag = "";
let targetUrl = "https://example.com";
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--url" && args[i + 1]) {
    urlFlag = args[i + 1];
    i += 1;
  } else if (args[i] === "--check" && args[i + 1]) {
    targetUrl = args[i + 1];
    i += 1;
  }
}

const base = (
  urlFlag ||
  process.env.HEALTH_BASE_URL ||
  process.env.PRODUCTION_HEALTH_URL ||
  ""
)
  .trim()
  .replace(/\/$/, "");

if (!base) {
  console.error("[check-smoke] Pass --url https://… or set HEALTH_BASE_URL / PRODUCTION_HEALTH_URL");
  process.exit(1);
}

const timeoutMs = Number(process.env.CHECK_SMOKE_TIMEOUT_MS || 25_000);
const endpoint = `${base}/api/check`;

function fail(msg, extra) {
  console.error(`[check-smoke] FAIL ${msg}`);
  if (extra != null) console.error(extra);
  process.exit(1);
}

async function main() {
  console.info(`[check-smoke] POST ${endpoint} body.url=${targetUrl}`);
  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ url: targetUrl }),
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (err) {
    fail("unreachable", err instanceof Error ? err.message : err);
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    fail(`invalid-json HTTP ${res.status}`, err instanceof Error ? err.message : err);
  }

  if (!res.ok || data?.ok !== true) {
    fail(`check failed HTTP ${res.status}`, data);
  }
  if (!data.analysis?.timing || typeof data.analysis.timing.totalMs !== "number") {
    fail("analysis.timing.totalMs missing", data.analysis?.timing);
  }
  if (typeof data.analysis.timing.ambiguousProbeStatus !== "boolean") {
    fail("analysis.timing.ambiguousProbeStatus missing (CheckTiming 1.5)", data.analysis?.timing);
  }

  console.info(
    `[check-smoke] OK level=${data.analysis?.risk?.level || "?"} totalMs=${data.analysis.timing.totalMs} probeMs=${data.analysis.timing.probeMs ?? "null"}`
  );
  process.exit(0);
}

main();