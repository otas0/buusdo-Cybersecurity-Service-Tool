#!/usr/bin/env node
/**
 * Staging Account-sync gate for Actions (Health monitor / Production health smoke).
 *
 * STAGING_HEALTH_URL unset → gate pending (exit 0, summary notice).
 * Set → fail closed unless GET /api/health has:
 *   ok: true, accountSyncEnabled: true, accountSyncTursoConfigured: true
 * Must not equal PRODUCTION_HEALTH_URL.
 *
 *   STAGING_HEALTH_URL=… node scripts/assert-staging-health.mjs
 *   STAGING_HEALTH_URL=… PRODUCTION_HEALTH_URL=… node scripts/assert-staging-health.mjs
 */
import { appendFileSync } from "node:fs";

const staging = String(process.env.STAGING_HEALTH_URL || "")
  .trim()
  .replace(/\/$/, "");
const prod = String(process.env.PRODUCTION_HEALTH_URL || "https://pcpd.mtsu.workers.dev")
  .trim()
  .replace(/\/$/, "");
const runUrl = String(process.env.GITHUB_RUN_URL || "").trim();
const summaryPath = process.env.GITHUB_STEP_SUMMARY || "";

function writeSummary(lines) {
  if (!summaryPath) return;
  appendFileSync(summaryPath, `${lines.join("\n")}\n`);
}

if (!staging) {
  writeSummary([
    "### Staging Account sync",
    "",
    "**gate pending** — set repository variable `STAGING_HEALTH_URL` to a non-prod Worker",
    "(Turso + mailer + `ACCOUNT_SYNC_ENABLED=1` via `wrangler --env staging`).",
    "See docs/DEPLOY_SECRETS.md § Staging Account sync · docs/ACCOUNT_SYNC_GATE.md",
    "",
    "Production stays `accountSyncEnabled: false` until the gate checklist is complete.",
  ]);
  console.log("STAGING_HEALTH_URL unset — Account sync gate pending (not a failure)");
  process.exit(0);
}

if (staging === prod) {
  console.error(`STAGING_HEALTH_URL must not equal production (${prod})`);
  process.exit(1);
}

const res = await fetch(`${staging}/api/health`, {
  headers: { accept: "application/json" },
  signal: AbortSignal.timeout(30_000),
});
if (!res.ok) {
  console.error(`staging health HTTP ${res.status} for ${staging}/api/health`);
  process.exit(1);
}
const body = await res.json();
const ok = body?.ok === true;
const syncOn = body?.accountSyncEnabled === true;
const turso = body?.accountSyncTursoConfigured === true;

console.log(JSON.stringify(body));

const fails = [];
if (!ok) fails.push("ok !== true");
if (!syncOn) fails.push("accountSyncEnabled !== true");
if (!turso) fails.push("accountSyncTursoConfigured !== true");

if (fails.length) {
  writeSummary([
    "### Staging Account sync health — FAIL",
    "",
    `- URL: \`${staging}\``,
    `- Flags: ok=\`${body?.ok}\` accountSyncEnabled=\`${body?.accountSyncEnabled}\` accountSyncTursoConfigured=\`${body?.accountSyncTursoConfigured}\``,
    `- Fail closed: ${fails.map((f) => `\`${f}\``).join(", ")}`,
    runUrl ? `- Run: ${runUrl}` : "",
    "",
    "Fix Turso secrets (`DATABASE_URL` / `DATABASE_AUTH_TOKEN`) on `pcpd-staging`, redeploy `--env staging`.",
  ].filter(Boolean));
  console.error(
    `assert-staging-health FAIL — ${fails.join("; ")} (STAGING_HEALTH_URL set → require Turso configured)`
  );
  process.exit(1);
}

writeSummary([
  "### Staging Account sync health",
  "",
  `- URL: \`${staging}\``,
  "- Assert: `accountSyncEnabled: true` + `accountSyncTursoConfigured: true` (staging only)",
  runUrl ? `- Run: ${runUrl}` : "",
  "",
  "Paste into docs/LAUNCH_CHECKLIST.md § D after green STRICT smokes.",
].filter(Boolean));

console.log(
  `assert-staging-health ok — ${staging} (sync+Turso)`
);
