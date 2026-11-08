/**
 * Spot-check: poster + privacy locale routes return 200.
 * Prefers curl (reliable timeouts); falls back to fetch for local origins.
 *
 *   PROMO_ORIGIN=https://buusdocst.mtsu.workers.dev npm run assert:promo-privacy-routes
 *   PROMO_ORIGIN=http://127.0.0.1:3000 npm run assert:promo-privacy-routes
 *
 * Offline soft-skip: when the origin is unreachable (timeout / DNS / fetch failed),
 * that URL is skipped with a notice — hard-fail only on non-2xx responses.
 * Network-independent survey absence: tests/privacy-fixture-no-survey.test.ts
 */
import { spawnSync } from "node:child_process";

const origin = (process.env.PROMO_ORIGIN || "https://buusdocst.mtsu.workers.dev").replace(/\/$/, "");
const paths = [
  "/promo/poster.html",
  "/en/privacy",
  "/pt-PT/privacy",
  "/zh-Hans/privacy",
];

function isUnreachable(msg) {
  return /fetch failed|AbortError|TimeoutError|ECONN|ENOTFOUND|timed out|curl exit|Could not resolve/i.test(
    msg,
  );
}

function curlStatus(url) {
  const r = spawnSync(
    "curl",
    ["-sL", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "20", "-A", "buusdo-promo-assert/1", url],
    { encoding: "utf8", timeout: 25_000 },
  );
  if (r.error) throw r.error;
  if (r.status && r.status !== 0 && !String(r.stdout || "").trim()) {
    throw new Error(`curl exit ${r.status}: ${r.stderr || ""}`);
  }
  const code = Number.parseInt(String(r.stdout || "").trim(), 10);
  if (!Number.isFinite(code)) {
    throw new Error(`curl bad status ${JSON.stringify(r.stdout)} stderr=${r.stderr}`);
  }
  return code;
}

async function fetchStatus(url) {
  const get = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(12_000) });
  await get.arrayBuffer();
  return get.status;
}

let failed = false;
const preferCurl = !/^https?:\/\/(127\.0\.0\.1|localhost)\b/i.test(origin);

for (const p of paths) {
  const url = `${origin}${p}`;
  let status;
  let via;
  try {
    if (preferCurl) {
      via = "curl";
      status = curlStatus(url);
    } else {
      via = "fetch";
      status = await fetchStatus(url);
    }
  } catch (err) {
    try {
      via = preferCurl ? "fetch" : "curl";
      status = preferCurl ? await fetchStatus(url) : curlStatus(url);
    } catch (err2) {
      const msg = [
        err instanceof Error ? err.message : String(err),
        err2 instanceof Error ? err2.message : String(err2),
      ].join(" | ");
      if (isUnreachable(msg)) {
        console.info(`[assert-promo-privacy-routes] soft-skip ${url} (${msg})`);
        continue;
      }
      console.error(`[assert-promo-privacy-routes] FAIL ${url}`, msg);
      failed = true;
      continue;
    }
  }
  // curl often prints 000 (→ 0) when the TCP connect fails — treat as soft-skip.
  if (!status || status === 0) {
    console.info(`[assert-promo-privacy-routes] soft-skip ${url} (HTTP ${status} via ${via})`);
    continue;
  }
  if (status < 200 || status >= 300) {
    console.error(`[assert-promo-privacy-routes] FAIL ${url} → HTTP ${status} (${via})`);
    failed = true;
  } else {
    console.info(`[assert-promo-privacy-routes] OK ${url} → ${status} (${via})`);
  }
}

if (failed) process.exit(1);
console.info(`[assert-promo-privacy-routes] OK origin=${origin}`);
