#!/usr/bin/env node
/**
 * Production HTML must reference a /_next/static/css/*.css that returns 200
 * and includes instrument styles (Halt primary + wordmark hide).
 *
 *   PRODUCTION_HEALTH_URL=https://buusdocst.mtsu.workers.dev node scripts/assert-prod-css-asset.mjs
 */
const base = String(
  process.env.PRODUCTION_HEALTH_URL ||
    process.env.PLAYWRIGHT_BASE_URL ||
    "https://buusdocst.mtsu.workers.dev"
).replace(/\/$/, "");

const pageUrl = `${base}/en`;
const pageRes = await fetch(pageUrl, { redirect: "follow" });
if (!pageRes.ok) {
  console.error(`FAIL: ${pageUrl} → ${pageRes.status}`);
  process.exit(1);
}
const html = await pageRes.text();
const m = html.match(/href="(\/_next\/static\/css\/[^"]+\.css)"/);
if (!m) {
  console.error("FAIL: no /_next/static/css/*.css link in /en HTML");
  process.exit(1);
}
const cssUrl = new URL(m[1], base).href;
const cssRes = await fetch(cssUrl, { redirect: "follow" });
const css = await cssRes.text();
if (!cssRes.ok) {
  console.error(`FAIL: ${cssUrl} → ${cssRes.status} (body ${css.length}b) — check assets.run_worker_first excludes /_next/static`);
  process.exit(1);
}
if (css.length < 1000) {
  console.error(`FAIL: ${cssUrl} body too small (${css.length}b)`);
  process.exit(1);
}
if (!/primary-button/.test(css) || !/--halt|ff4d00/i.test(css)) {
  console.error(`FAIL: ${cssUrl} missing Halt primary-button styles`);
  process.exit(1);
}
if (!/brand-logo-on-light/.test(css)) {
  console.error(`FAIL: ${cssUrl} missing brand-logo-on-light hide rules`);
  process.exit(1);
}
console.log(`assert-prod-css-asset ok — ${cssUrl} (${css.length}b)`);
