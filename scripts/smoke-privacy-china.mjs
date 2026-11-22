#!/usr/bin/env node
/**
 * Live Workers privacy China section smoke (CF-reachable runners).
 *
 *   node scripts/smoke-privacy-china.mjs
 *   HEALTH_BASE_URL=https://buusdocst.mtsu.workers.dev node scripts/smoke-privacy-china.mjs
 */
const base = (
  process.env.HEALTH_BASE_URL ||
  process.env.PRODUCTION_HEALTH_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  "https://buusdocst.mtsu.workers.dev"
)
  .trim()
  .replace(/\/$/, "");

const pages = [
  {
    path: "/zh-Hans/privacy",
    needles: ["privacy-china-notice", "中国大陆入口", "otas0.github.io/buusdocst"]
  },
  {
    path: "/en/privacy",
    needles: ["privacy-china-notice", "China mainland entry", "otas0.github.io/buusdocst"]
  }
];

async function fetchText(url) {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(45_000),
    headers: { Accept: "text/html" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

let failed = false;
for (const row of pages) {
  const url = `${base}${row.path}`;
  try {
    const html = await fetchText(url);
    const missing = row.needles.filter((n) => !html.includes(n));
    if (missing.length) {
      console.error(`FAIL ${url} missing: ${missing.join(", ")}`);
      failed = true;
    } else {
      console.info(`ok ${url} privacy China section present`);
    }
  } catch (err) {
    console.error(`FAIL ${url}: ${err instanceof Error ? err.message : err}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.info("smoke-privacy-china ok");
