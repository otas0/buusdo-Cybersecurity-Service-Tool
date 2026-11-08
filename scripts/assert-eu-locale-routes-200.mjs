#!/usr/bin/env node
/**
 * Soft post-deploy check: every Europe catalog locale route returns HTTP 200.
 *
 *   PLAYWRIGHT_LIVE_BASE_URL=https://… node scripts/assert-eu-locale-routes-200.mjs
 *
 * Env:
 *   HEALTH_TIMEOUT_MS / LOCALE_TIMEOUT_MS — split budgets (default 8s / 12s)
 *   EU_LOCALE_CONCURRENCY — parallel locale fetches (default 6)
 *   PLAYWRIGHT_PREVIEW_BASE_URL — fallback origin after LIVE/PROD/STAGING
 *   WORKERS_TIMEOUT_WEBHOOK_URL — optional timeout alert (opt-in)
 *   EU_FAIL_ARTIFACT — path to write failure markdown for Deploy Summary pin (optional)
 *
 * Skips (exit 0) when no live base / origin unreachable; prints ::notice::skipped-live.
 * Pure Node — no package.json dependencies (Deploy soft job can skip npm ci).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendStepSummaryAsync,
  formatProbeTable,
  healthTimeoutMs,
  localeTimeoutMs,
  liveOriginCandidates,
  mapPool,
  maybeTimeoutWebhook,
  resolveLiveOrigin
} from "./lib/live-origin.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const localesSrc = fs.readFileSync(path.join(root, "i18n/locales.ts"), "utf8");
const europeIds = [...localesSrc.matchAll(/\{ id: "([^"]+)"[^}]*region: "europe"/g)].map(
  (m) => m[1]
);

function concurrency() {
  const n = Number(process.env.EU_LOCALE_CONCURRENCY || 6);
  return Number.isFinite(n) && n > 0 ? Math.min(24, Math.round(n)) : 6;
}

function failureTableMarkdown(localeRows) {
  return [
    "## EU locale route failures",
    "",
    "| Locale | http_code | time_total |",
    "| --- | ---: | ---: |",
    ...localeRows
      .filter((r) => r.http_code !== "200")
      .map((r) => `| \`${r.id}\` | ${r.http_code} | ${r.time_total}s |`),
    ""
  ].join("\n");
}

const candidates = liveOriginCandidates();
if (!candidates.length) {
  const stagingHint =
    process.env.DEPLOY_TARGET === "staging"
      ? " Staging first deploy: set repo var `STAGING_HEALTH_URL` to the printed `*.workers.dev` URL, then re-run Deploy (or soft EU job)."
      : "";
  console.log(
    `::notice::skipped-live [eu-routes-200] no PLAYWRIGHT_LIVE_BASE_URL / PRODUCTION_HEALTH_URL / STAGING_HEALTH_URL.${stagingHint}`
  );
  await appendStepSummaryAsync(
    `## EU locale routes\n\nSkipped — no smoke origin.${stagingHint}\n\nSet \`STAGING_HEALTH_URL\` (staging) or \`PRODUCTION_HEALTH_URL\` / deploy \`site_url\` (production).\n`
  );
  process.exit(0);
}

console.log(
  `[eu-routes-200] healthTimeout=${healthTimeoutMs()}ms localeTimeout=${localeTimeoutMs()}ms concurrency=${concurrency()} candidates=${candidates.join(" ")}`
);

const { base, probes } = await resolveLiveOrigin();
const probeMd = formatProbeTable(probes);
console.log(probeMd);
await appendStepSummaryAsync(probeMd);

if (!base) {
  const detail = probes
    .map((p) => `${p.http_code}/${p.time_total}s${p.err ? `:${p.err}` : ""}`)
    .join(" ");
  console.log(`::notice::skipped-live [eu-routes-200] origin unreachable (${detail})`);
  const timedOut = probes.some((p) => p.http_code === "000" || p.err === "timeout");
  if (timedOut) {
    await maybeTimeoutWebhook({
      text: `[eu-routes-200] connectivity timeout — ${detail}`,
      probes
    });
  }
  process.exit(0);
}

console.log(`[eu-routes-200] using ${base}`);

const localeTimeout = localeTimeoutMs();
const localeRows = await mapPool(europeIds, concurrency(), async (id) => {
  const url = `${base}/${id}`;
  const started = performance.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(localeTimeout),
      redirect: "follow",
      headers: { Accept: "text/html" }
    });
    const time_total = ((performance.now() - started) / 1000).toFixed(3);
    if (res.status !== 200) {
      console.error(`[eu-routes-200] FAIL ${url} → ${res.status} (${time_total}s)`);
    } else {
      console.log(`[eu-routes-200] OK ${id} (${time_total}s)`);
    }
    return { id, http_code: String(res.status), time_total };
  } catch (err) {
    const time_total = ((performance.now() - started) / 1000).toFixed(3);
    const msg = /timeout|aborted/i.test(String(err?.message || err)) ? "timeout" : "error";
    console.error(`[eu-routes-200] FAIL ${url} ${msg} (${time_total}s)`);
    return { id, http_code: "000", time_total, err: msg };
  }
});

const failures = localeRows.filter((r) => r.http_code !== "200");

if (failures.length) {
  const table = failureTableMarkdown(localeRows);
  // Soft job summary: pin failures at the top of this job's step summary.
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    const prev = fs.existsSync(summaryPath) ? fs.readFileSync(summaryPath, "utf8") : "";
    fs.writeFileSync(summaryPath, `${table}\n${prev}`);
  } else {
    await appendStepSummaryAsync(table);
  }
  const artifact = (process.env.EU_FAIL_ARTIFACT || "").trim();
  if (artifact) {
    fs.mkdirSync(path.dirname(artifact) || ".", { recursive: true });
    fs.writeFileSync(
      artifact,
      `${table}\n_Origin:_ \`${base}\` · ${failures.length} failure(s)\n`
    );
  }
  console.error(`[eu-routes-200] ${failures.length} failures: ${failures.map((f) => `${f.id}=${f.http_code}`).join(" ")}`);
  process.exit(1);
}

console.log(`::notice::[eu-routes-200] all ${europeIds.length} Europe locale routes returned 200`);
await appendStepSummaryAsync(
  `## EU locale routes\n\nAll **${europeIds.length}** Europe locales returned HTTP 200 on \`${base}\`.\n`
);
