#!/usr/bin/env node
/**
 * Staging health for Actions (Health monitor / Production health smoke).
 *
 * Account sync product cancelled — when STAGING_HEALTH_URL is set, fail closed
 * unless GET /api/health has ok: true and accountSyncEnabled: false.
 * Must not equal PRODUCTION_HEALTH_URL.
 *
 *   STAGING_HEALTH_URL=… node scripts/assert-staging-health.mjs
 */
import { appendFileSync } from "node:fs";

const staging = String(process.env.STAGING_HEALTH_URL || "")
  .trim()
  .replace(/\/$/, "");
const prod = String(process.env.PRODUCTION_HEALTH_URL || "https://buusdocst.mtsu.workers.dev")
  .trim()
  .replace(/\/$/, "");
const runUrl = String(process.env.GITHUB_RUN_URL || "").trim();
const summaryPath = process.env.GITHUB_STEP_SUMMARY || "";

function writeSummary(lines) {
  if (!summaryPath) return;
  appendFileSync(summaryPath, `${lines.join("\n")}\n`);
}

const GATE_DOC =
  "https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/blob/main/docs/ACCOUNT_SYNC_GATE.md";

if (!staging) {
  writeSummary([
    "### Staging health",
    "",
    "**optional** — `STAGING_HEALTH_URL` unset (not a failure).",
    "Account sync product is **cancelled** — no Turso/mailer staging gate.",
    "",
    `See [ACCOUNT_SYNC_GATE.md](${GATE_DOC}).`,
  ]);
  console.log("STAGING_HEALTH_URL unset — staging health optional (not a failure)");
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

console.log(JSON.stringify(body));

const fails = [];
if (!ok) fails.push("ok !== true");
if (syncOn) fails.push("accountSyncEnabled must stay false (product cancelled)");

if (fails.length) {
  writeSummary([
    "### Staging health — FAIL",
    "",
    `- URL: \`${staging}\``,
    `- Flags: ok=\`${body?.ok}\` accountSyncEnabled=\`${body?.accountSyncEnabled}\``,
    `- Fail closed: ${fails.map((f) => `\`${f}\``).join(", ")}`,
    runUrl ? `- Run: ${runUrl}` : "",
    "",
    "Account sync is cancelled — set ACCOUNT_SYNC_ENABLED=0 on staging and redeploy.",
    "",
    `Doc: [ACCOUNT_SYNC_GATE.md](${GATE_DOC})`,
  ].filter(Boolean));
  console.error(`assert-staging-health FAIL — ${fails.join("; ")}`);
  process.exit(1);
}

writeSummary([
  "### Staging health",
  "",
  `- URL: \`${staging}\``,
  "- Assert: `ok: true` + `accountSyncEnabled: false` (Account sync cancelled)",
  runUrl ? `- Run: ${runUrl}` : "",
].filter(Boolean));

console.log(`assert-staging-health ok — ${staging} (sync cancelled / off)`);
