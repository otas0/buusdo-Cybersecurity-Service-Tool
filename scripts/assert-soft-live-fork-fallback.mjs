/**
 * Documented dry-run / static assert: privacy-prod fork fallback for streak artifacts.
 * When `gh api …/artifacts` lacks permission on forks, the workflow must fall back to
 * `gh run download -n soft-live-hash-streak`.
 *
 *   node scripts/assert-soft-live-fork-fallback.mjs
 *
 * Manual check (fork PR Actions log):
 *   1. Confirm step "Download prior soft-live-hash-streak artifact" prints either
 *      "Downloaded prior artifact id=…" OR "trying run download fallback".
 *   2. On API 403/empty: expect "Downloaded prior via gh run download run=…" or
 *      "No prior soft-live-hash-streak artifact — starting from baseline".
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const yml = readFileSync(path.join(root, ".github/workflows/privacy-prod.yml"), "utf8");
const ciDoc = readFileSync(path.join(root, "docs/CI.md"), "utf8");

let failed = 0;
function must(cond, msg) {
  if (!cond) {
    console.error(`[assert-soft-live-fork-fallback] ${msg}`);
    failed += 1;
  }
}

must(yml.includes("gh api"), "privacy-prod.yml must try gh api for artifacts");
must(
  yml.includes("gh run download") && yml.includes("soft-live-hash-streak"),
  "privacy-prod.yml must fall back to gh run download -n soft-live-hash-streak"
);
must(
  yml.includes("fork") || yml.includes("lacks permission"),
  "privacy-prod.yml must mention fork / permission fallback path"
);
must(
  ciDoc.includes("Fork streak restore") || ciDoc.includes("gh run download"),
  "docs/CI.md must document fork streak restore"
);
must(
  yml.includes("soft-live-hash-inview-outcome"),
  "privacy-prod.yml must upload soft-live-hash-inview-outcome artifact"
);

if (failed) process.exit(1);
console.log(
  "[assert-soft-live-fork-fallback] OK (gh api + gh run download fallback + docs/CI.md + inview artifact)"
);
console.log(
  "Manual: on a fork PR, confirm Actions log shows run-download fallback when gh api is empty/403."
);
