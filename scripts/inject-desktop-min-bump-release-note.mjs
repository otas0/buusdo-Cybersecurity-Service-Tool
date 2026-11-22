/**
 * When minSupportedVersion rises vs PREV_REF, insert minSupportedBumpReason into
 * desktop-app/RELEASE.md under the <!-- __MIN_SUPPORTED_BUMP_NOTES__ --> marker.
 *
 *   PREV_REF=desktop-v0.2.0 node scripts/inject-desktop-min-bump-release-note.mjs
 *   PREV_REF=… node scripts/inject-desktop-min-bump-release-note.mjs --check
 *
 * Soft-skip (exit 0) when PREV_REF missing, no raise, or reason already present.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(".");
const require = createRequire(import.meta.url);
const { parseSemver, isNewer } = require(path.join(root, "desktop-app/src/semver.js"));

const checkOnly = process.argv.includes("--check");
const prevRef = String(process.env.PREV_REF || "").trim();
const releasePath = path.join(root, "desktop-app/RELEASE.md");
const marker = "<!-- __MIN_SUPPORTED_BUMP_NOTES__ -->";

const current = JSON.parse(
  readFileSync(path.join(root, "shared/desktop-downloads.json"), "utf8")
);
const curMin = String(current.minSupportedVersion || "").trim();
const curReason = String(current.minSupportedBumpReason || "").trim();

if (!prevRef) {
  console.log("[inject-min-bump-release] PREV_REF unset — skip");
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
  console.log(`[inject-min-bump-release] cannot read ${prevRef}:shared/desktop-downloads.json — skip`);
  process.exit(0);
}

const prev = JSON.parse(prevRaw);
const prevMin = String(prev.minSupportedVersion || "").trim();

if (!curMin || !parseSemver(curMin)) {
  console.log("[inject-min-bump-release] current min invalid — skip");
  process.exit(0);
}
if (!prevMin || !parseSemver(prevMin)) {
  console.log("[inject-min-bump-release] prev min missing — skip");
  process.exit(0);
}
if (!isNewer(curMin, prevMin)) {
  console.log(`[inject-min-bump-release] min not raised (${prevMin} → ${curMin}) — skip`);
  process.exit(0);
}
if (!curReason) {
  console.error("[inject-min-bump-release] min raised but minSupportedBumpReason empty");
  process.exit(1);
}

const isoDate = new Date().toISOString().slice(0, 10);
const bullet = `- **${curMin}** (${isoDate}, vs ${prevMin}): ${curReason}`;
let md = readFileSync(releasePath, "utf8");

if (!md.includes(marker)) {
  // Ensure marker section exists under Install / first open guidance.
  const section = `\n## Min-supported bumps\n\n${marker}\n\n`;
  if (md.includes("## Verify before ship")) {
    md = md.replace("## Verify before ship", `${section}## Verify before ship`);
  } else {
    md = `${md.trimEnd()}\n${section}`;
  }
}

if (md.includes(curReason) && md.includes(`**${curMin}**`)) {
  console.log("[inject-min-bump-release] reason already in RELEASE.md — ok");
  process.exit(0);
}

const next = md.replace(marker, `${marker}\n${bullet}`);

if (checkOnly) {
  if (next !== md) {
    console.error(
      "[inject-min-bump-release] RELEASE.md missing bump bullet — run without --check after raising min"
    );
    process.exit(1);
  }
  console.log("[inject-min-bump-release] OK");
  process.exit(0);
}

writeFileSync(releasePath, next);
console.log(`[inject-min-bump-release] inserted: ${bullet}`);
console.log(
  "[inject-min-bump-release] next: git add desktop-app/RELEASE.md  (include the bump bullet in your commit)"
);
