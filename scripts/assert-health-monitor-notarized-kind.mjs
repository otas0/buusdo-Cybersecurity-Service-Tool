/**
 * health-monitor.yml must soft-parse NOTARIZED_HEAD_KIND (and soft warn / rate limit).
 *
 *   node scripts/assert-health-monitor-notarized-kind.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const yml = readFileSync(path.join(process.cwd(), ".github/workflows/health-monitor.yml"), "utf8");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

for (const needle of [
  "NOTARIZED_HEAD_KIND",
  "DOWNLOAD_SOFT_WARN_COUNT",
  "notarized_kind",
  "soft_warn",
  "rateLimited",
  "soft-download-slack-state-v1",
  "force_soft_slack",
  "skipped-no-webhook"
]) {
  if (!yml.includes(needle)) {
    fail(`health-monitor.yml missing ${needle}`);
  }
}

if (!yml.includes("http-404")) {
  fail("health-monitor.yml must mention notarized http-404 annotate path");
}

console.log("assert-health-monitor-notarized-kind ok");
