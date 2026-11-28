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

const pngUrls = [
  `${base}/brand/buusdo-wordmark.png`,
  `${base}/brand/buusdo-wordmark-on-light.png`
];
const svgUrls = [
  `${base}/brand/buusdo-wordmark.svg`,
  `${base}/brand/buusdo-wordmark-on-light.svg`
];

for (const url of pngUrls) {
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

for (const url of svgUrls) {
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  if (!res.ok) {
    console.error(`FAIL: ${url} → ${res.status}`);
    process.exit(1);
  }
  if (text.length < 200 || !/<svg[\s>]/i.test(text)) {
    console.error(`FAIL: ${url} missing SVG markup (${text.length}b)`);
    process.exit(1);
  }
  if (/data:image\/png/i.test(text)) {
    console.error(`FAIL: ${url} still embeds PNG — want true vector paths`);
    process.exit(1);
  }
  console.log(`ok ${url} (${text.length}b vector)`);
}
console.log("assert-prod-brand-asset ok");
