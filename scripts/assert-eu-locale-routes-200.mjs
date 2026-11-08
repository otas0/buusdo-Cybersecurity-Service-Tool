#!/usr/bin/env node
/**
 * Soft post-deploy check: every Europe catalog locale route returns HTTP 200.
 *
 *   PLAYWRIGHT_LIVE_BASE_URL=https://… node scripts/assert-eu-locale-routes-200.mjs
 *
 * Skips (exit 0) when no live base / origin unreachable.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const localesSrc = fs.readFileSync(path.join(root, "i18n/locales.ts"), "utf8");
const europeIds = [...localesSrc.matchAll(/\{ id: "([^"]+)"[^}]*region: "europe"/g)].map(
  (m) => m[1]
);

const base = (
  process.env.PLAYWRIGHT_LIVE_BASE_URL ||
  process.env.PRODUCTION_HEALTH_URL ||
  process.env.STAGING_HEALTH_URL ||
  ""
)
  .trim()
  .replace(/\/$/, "");

if (!base) {
  console.log("[eu-routes-200] skip — set PLAYWRIGHT_LIVE_BASE_URL");
  process.exit(0);
}

let healthOk = false;
try {
  const res = await fetch(`${base}/api/health`, {
    signal: AbortSignal.timeout(12_000),
    headers: { Accept: "application/json" }
  });
  if (res.ok) {
    const data = await res.json();
    healthOk = data?.ok === true;
  }
} catch {
  healthOk = false;
}

if (!healthOk) {
  console.log(`[eu-routes-200] skip — origin unreachable: ${base}`);
  process.exit(0);
}

const failures = [];
for (const id of europeIds) {
  const url = `${base}/${id}`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20_000),
      redirect: "follow",
      headers: { Accept: "text/html" }
    });
    if (res.status !== 200) {
      failures.push(`${id}=${res.status}`);
      console.error(`[eu-routes-200] FAIL ${url} → ${res.status}`);
    } else {
      console.log(`[eu-routes-200] OK ${id}`);
    }
  } catch (err) {
    failures.push(`${id}=error`);
    console.error(`[eu-routes-200] FAIL ${url}`, err?.message || err);
  }
}

if (failures.length) {
  console.error(`[eu-routes-200] ${failures.length} failures: ${failures.join(" ")}`);
  process.exit(1);
}
console.log(`::notice::[eu-routes-200] all ${europeIds.length} Europe locale routes returned 200`);
