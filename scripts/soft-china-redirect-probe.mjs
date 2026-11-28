#!/usr/bin/env node
/**
 * Soft CN redirect probe for CF-reachable runners (ubuntu Actions).
 *
 * Cannot spoof request.cf.country from outside. This script:
 * 1) Asserts wrap live (x-buusdocst-china-wrap) on /api/health
 * 2) Records non-CN sample (expected on ubuntu) + documents that a real CN
 *    302 must show Location → otas0.github.io when x-buusdocst-cf-country: CN
 * 3) Optionally checks staging first when STAGING_HEALTH_URL is set
 *
 *   node scripts/soft-china-redirect-probe.mjs
 *   PRODUCTION_HEALTH_URL=https://… STAGING_HEALTH_URL=https://… node scripts/soft-china-redirect-probe.mjs
 *
 * Exit 0 always for soft CI (prints ::notice:: / summary lines). Exit 1 only
 * when --strict and wrap header missing on prod.
 */
import { writeFileSync } from "node:fs";

const strict = process.argv.includes("--strict");
const prod =
  (process.env.PRODUCTION_HEALTH_URL || "https://buusdocst.mtsu.workers.dev").replace(
    /\/$/,
    ""
  );
const staging = (process.env.STAGING_HEALTH_URL || "").replace(/\/$/, "");

async function probe(base, label) {
  const out = { label, base, wrap: false, country: null, geoOk: false, htmlStatus: null, location: null };
  try {
    const h = await fetch(`${base}/api/health`, { redirect: "manual" });
    out.wrap = h.headers.get("x-buusdocst-china-wrap") === "1";
    out.country = h.headers.get("x-buusdocst-cf-country");
  } catch (e) {
    out.healthError = String(e && e.message ? e.message : e);
  }
  try {
    const g = await fetch(`${base}/api/geo`, { redirect: "manual" });
    if (g.ok) {
      const j = await g.json();
      out.geoOk = j && j.ok === true && "cfCountry" in j;
      out.geoCountry = j.cfCountry ?? j.country ?? null;
      out.wrapHints = j.wrapHints || null;
    }
  } catch (e) {
    out.geoError = String(e && e.message ? e.message : e);
  }
  try {
    const html = await fetch(`${base}/`, { redirect: "manual" });
    out.htmlStatus = html.status;
    out.location = html.headers.get("location");
    out.htmlWrap = html.headers.get("x-buusdocst-china-wrap");
    out.htmlCountry = html.headers.get("x-buusdocst-cf-country");
    // Real CN sample shape (for docs / Logpush alignment):
    // status 302, country CN, Location hosts otas0.github.io
    out.wouldBeCn302Shape =
      out.htmlCountry === "CN" &&
      (html.status === 302 || html.status === 301) &&
      String(out.location || "").includes("otas0.github.io");
  } catch (e) {
    out.htmlError = String(e && e.message ? e.message : e);
  }
  return out;
}

const results = [];
if (staging) {
  results.push(await probe(staging, "staging"));
}
results.push(await probe(prod, "prod"));

const summary = {
  checkedAt: new Date().toISOString(),
  note:
    "Ubuntu is rarely CF country CN — do not fail on missing 302. Fail soft/strict only when wrap header absent. Real CN 302: EdgeResponseStatus=302 + ClientCountry=CN + Location→otas0.github.io (Logpush).",
  results
};

const path = process.env.GITHUB_STEP_SUMMARY;
const lines = [
  "### Soft China redirect probe",
  "",
  summary.note,
  ""
];
for (const r of results) {
  lines.push(
    `- **${r.label}** \`${r.base}\`: wrap=${r.wrap ? "yes" : "NO"} country=${r.country || r.htmlCountry || "?"} geo=${r.geoOk ? "ok" : "fail"} html=${r.htmlStatus} loc=${r.location || "—"} cn302sample=${r.wouldBeCn302Shape ? "yes" : "no"}`
  );
  console.log(
    `::notice::soft-china-probe ${r.label} wrap=${r.wrap} country=${r.country || r.htmlCountry} html=${r.htmlStatus}`
  );
}
lines.push("");

if (path) {
  writeFileSync(path, `${lines.join("\n")}\n`, { flag: "a" });
}

console.log(JSON.stringify(summary, null, 2));

const prodRow = results.find((r) => r.label === "prod");
if (strict && prodRow && !prodRow.wrap) {
  console.error("STRICT: prod missing x-buusdocst-china-wrap");
  process.exit(1);
}
process.exit(0);
