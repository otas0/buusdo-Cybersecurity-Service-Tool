#!/usr/bin/env node
/**
 * Health smoke for local or production.
 *
 *   npm run health:smoke
 *   npm run health:prod -- --url https://shield.example.com
 *   HEALTH_BASE_URL=https://… node scripts/health-smoke.mjs
 *
 * Exit 0 only when /api/health passes required assertions.
 */
const args = process.argv.slice(2);
let urlFlag = "";
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--url" && args[i + 1]) {
    urlFlag = args[i + 1];
    i += 1;
  }
}

const base = (
  urlFlag ||
  process.env.HEALTH_BASE_URL ||
  process.env.PRODUCTION_HEALTH_URL ||
  "http://localhost:3000"
)
  .trim()
  .replace(/\/$/, "");

const healthUrl = `${base}/api/health`;
const timeoutMs = Number(process.env.HEALTH_SMOKE_TIMEOUT_MS || 10_000);

function fail(msg, extra) {
  console.error(`[health-smoke] FAIL ${msg}`);
  if (extra != null) console.error(extra);
  process.exit(1);
}

async function main() {
  console.info(`[health-smoke] GET ${healthUrl}`);
  let res;
  try {
    res = await fetch(healthUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (err) {
    fail("unreachable", err instanceof Error ? err.message : err);
  }

  if (!res.ok) fail(`HTTP ${res.status}`);

  let data;
  try {
    data = await res.json();
  } catch (err) {
    fail("invalid-json", err instanceof Error ? err.message : err);
  }

  if (data?.ok !== true) fail("ok !== true", data);
  if (data?.service !== "buusdocst") fail("service mismatch", data?.service);
  if (data?.threatIntel !== "own") fail("threatIntel must be own", data?.threatIntel);
  if (data?.thirdPartyReputation !== false) fail("thirdPartyReputation must be false");
  if (data?.curatedListPresent !== true) {
    fail("curatedListPresent must be true (bundle missing curated-threats.json?)");
  }
  if (typeof data?.probeTimeoutMs !== "number" || data.probeTimeoutMs <= 0) {
    fail("probeTimeoutMs missing or invalid", data?.probeTimeoutMs);
  }
  if (typeof data?.accountSyncEnabled !== "boolean") {
    fail("accountSyncEnabled missing (expect boolean)", data?.accountSyncEnabled);
  }

  console.info(
    `[health-smoke] OK service=${data.service} probeTimeoutMs=${data.probeTimeoutMs} accountSyncEnabled=${data.accountSyncEnabled} checkedAt=${data.checkedAt}`
  );
  process.exit(0);
}

main();