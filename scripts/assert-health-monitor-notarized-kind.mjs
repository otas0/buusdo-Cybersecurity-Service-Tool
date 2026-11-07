/**
 * health-monitor.yml must soft-parse NOTARIZED_HEAD_KIND (and soft warn / rate limit).
 * Unsigned GitHub ship: missing / http-404 notarized HEAD is expected — point at DESKTOP_SETUP_GUIDE.
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
if (!yml.includes('notarized_kind" = "missing"') && !yml.includes("[ \"$notarized_kind\" = \"missing\" ]")) {
  fail("health-monitor.yml must soft-accept NOTARIZED_HEAD_KIND=missing (unsigned ship)");
}
if (!yml.includes("unsigned") || !yml.includes("DESKTOP_SETUP_GUIDE")) {
  fail("health-monitor.yml must mention unsigned ship + DESKTOP_SETUP_GUIDE");
}
if (!yml.includes("gate pending")) {
  fail("health-monitor.yml must summarize gate pending when STAGING_HEALTH_URL unset");
}
if (!yml.includes("RELEASE_HINT") || !yml.includes("DESKTOP_SETUP_GUIDE")) {
  fail("health-monitor.yml soft Slack RELEASE_HINT must point at DESKTOP_SETUP_GUIDE");
}
if (!yml.includes("service=buusdocst")) {
  fail("health-monitor.yml Slack alert text must include service=buusdocst");
}

console.log("assert-health-monitor-notarized-kind ok");
