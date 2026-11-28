#!/usr/bin/env node
/**
 * When shared/china-pages.json mirrorUrl is non-empty, soft-compare mirror
 * HTML to canonical notice (title + service-closed markers).
 *
 *   node scripts/soft-china-mirror-probe.mjs
 *
 * Empty mirrorUrl → skip (exit 0). Soft: network fail → notice, exit 0.
 * Mismatch → exit 1 (CI soft job may continue-on-error).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const cfg = JSON.parse(
  readFileSync(join(process.cwd(), "shared/china-pages.json"), "utf8")
);
const canonical = String(cfg.url || "https://otas0.github.io/buusdocst/").replace(/\/$/, "");
const mirror = String(cfg.mirrorUrl || "").trim().replace(/\/$/, "");

if (!mirror) {
  console.info("[soft-china-mirror] mirrorUrl empty — skip");
  process.exit(0);
}

async function fetchText(url) {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(20_000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function markers(html) {
  return {
    hasServiceClosed:
      /data-testid=["']china-notice-service-closed["']/.test(html) ||
      /检查服务未开放|not offered on mainland/i.test(html),
    hasNoticeTitle: /data-testid=["']china-notice-title["']/.test(html),
    hasClosedCopy: /不提供|不承诺|does not offer|未开放/i.test(html)
  };
}

try {
  const [a, b] = await Promise.all([
    fetchText(`${canonical}/`),
    fetchText(`${mirror}/`)
  ]);
  const ma = markers(a);
  const mb = markers(b);
  console.info("[soft-china-mirror] canonical", ma);
  console.info("[soft-china-mirror] mirror", mb);
  const ok =
    ma.hasServiceClosed &&
    mb.hasServiceClosed &&
    ma.hasNoticeTitle &&
    mb.hasNoticeTitle &&
    ma.hasClosedCopy &&
    mb.hasClosedCopy;
  if (!ok) {
    console.error("[soft-china-mirror] FAIL — mirror missing notice markers vs canonical");
    process.exit(1);
  }
  console.info(`[soft-china-mirror] OK ${mirror} matches canonical notice markers`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `\n- Soft China mirror \`${mirror}\`: **OK** (service-closed parity with ${canonical})\n`
    );
  }
  process.exit(0);
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.info(`[soft-china-mirror] soft-skip: ${msg}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `\n- Soft China mirror: soft-skip (${msg})\n`
    );
  }
  process.exit(0);
}
