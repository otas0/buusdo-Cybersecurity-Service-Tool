/**
 * When minSupportedVersion rises vs a previous desktop-downloads.json (git tag / PREV_REF),
 * minSupportedBumpReason must change.
 *
 *   PREV_REF=desktop-v0.2.0 node scripts/assert-desktop-min-bump-reason-diff.mjs
 *   # or during release: PREV_REF=$(git describe --tags --match 'desktop-v*' --abbrev=0 HEAD^) …
 *
 * Soft-skip (exit 0) when PREV_REF missing or file unreadable.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(".");
const require = createRequire(import.meta.url);
const { parseSemver, isNewer } = require(path.join(root, "desktop-app/src/semver.js"));

const prevRef = String(process.env.PREV_REF || "").trim();
const current = JSON.parse(
  readFileSync(path.join(root, "shared/desktop-downloads.json"), "utf8")
);
const curMin = String(current.minSupportedVersion || "").trim();
const curReason = String(current.minSupportedBumpReason || "").trim();

if (!prevRef) {
  console.log("[min-bump-reason-diff] PREV_REF unset — skip");
  process.exit(0);
}

let prevRaw = "";
try {
  prevRaw = execSync(`git show ${prevRef}:shared/desktop-downloads.json`, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 2_000_000
  });
} catch {
  console.log(`[min-bump-reason-diff] cannot read ${prevRef}:shared/desktop-downloads.json — skip`);
  process.exit(0);
}

let prev;
try {
  prev = JSON.parse(prevRaw);
} catch {
  console.error("[min-bump-reason-diff] previous desktop-downloads.json is not JSON");
  process.exit(1);
}

const prevMin = String(prev.minSupportedVersion || "").trim();
const prevReason = String(prev.minSupportedBumpReason || "").trim();

if (!parseSemver(curMin) || !parseSemver(prevMin)) {
  console.error("[min-bump-reason-diff] unparsable minSupportedVersion");
  process.exit(1);
}

if (!isNewer(curMin, prevMin)) {
  console.log(
    `[min-bump-reason-diff] min unchanged or lower (${prevMin} → ${curMin}) — OK`
  );
  process.exit(0);
}

if (!curReason) {
  console.error(
    "[min-bump-reason-diff] minSupportedVersion raised but minSupportedBumpReason is empty"
  );
  process.exit(1);
}
if (curReason === prevReason) {
  console.error(
    `[min-bump-reason-diff] min raised ${prevMin} → ${curMin} but minSupportedBumpReason unchanged — rewrite the reason line`
  );
  process.exit(1);
}

console.log(
  `[min-bump-reason-diff] OK: min ${prevMin} → ${curMin}; reason updated vs ${prevRef}`
);
