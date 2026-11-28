#!/usr/bin/env node
/**
 * Production wordmark must return a non-empty PNG (not content-length:0).
 *
 *   PRODUCTION_HEALTH_URL=https://buusdocst.mtsu.workers.dev node scripts/assert-prod-brand-asset.mjs
 */
const base = String(
  process.env.PRODUCTION_HEALTH_URL ||
    process.env.PLAYWRIGHT_BASE_URL ||
    "https://buusdocst.mtsu.workers.dev"
).replace(/\/$/, "");

const urls = [
  `${base}/brand/buusdo-wordmark.png`,
  `${base}/brand/buusdo-wordmark-on-light.png`
];

for (const url of urls) {
  const res = await fetch(url, { redirect: "follow" });
  const buf = Buffer.from(await res.arrayBuffer());
  if (!res.ok) {
    console.error(`FAIL: ${url} → ${res.status}`);
    process.exit(1);
  }
  if (buf.length < 100) {
    console.error(
      `FAIL: ${url} body too small (${buf.length}b) — exclude /brand/* from run_worker_first so Assets serves the file`
    );
    process.exit(1);
  }
  if (buf[0] !== 0x89 || buf[1] !== 0x50) {
    console.error(`FAIL: ${url} is not a PNG (got ${buf.slice(0, 4).toString("hex")})`);
    process.exit(1);
  }
  console.log(`ok ${url} (${buf.length}b)`);
}
console.log("assert-prod-brand-asset ok");
