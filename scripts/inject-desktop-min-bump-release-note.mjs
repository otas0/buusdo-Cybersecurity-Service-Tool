/**
 * When minSupportedVersion rises vs PREV_REF, insert minSupportedBumpReason into
 * desktop-app/RELEASE.md under the <!-- __MIN_SUPPORTED_BUMP_NOTES__ --> marker.
 *
 *   PREV_REF=desktop-v0.2.0 node scripts/inject-desktop-min-bump-release-note.mjs
 *   PREV_REF=… node scripts/inject-desktop-min-bump-release-note.mjs --check
 *   PREV_REF=… node scripts/inject-desktop-min-bump-release-note.mjs --stage
 *   node scripts/inject-desktop-min-bump-release-note.mjs --backfill-dates
 *
 * Soft-skip (exit 0) when PREV_REF missing, no raise, or reason already present.
 * --stage: after write, `git add desktop-app/RELEASE.md` (default: print tip only).
 * --backfill-dates: add ISO dates to historical bullets missing them (git blame).
 *
 * Fixture / CI env (unit tests — do not use in production inject):
 *   SHIELD_RELEASE_MD     — absolute/relative path to a RELEASE.md fixture
 *   SHIELD_BACKFILL_FIXTURE=1 — skip git blame; use SHIELD_BACKFILL_FIXTURE_ISO (default 2026-01-15)
 *   GITHUB_STEP_SUMMARY   — with GITHUB_ACTIONS=true, --backfill-dates --check appends would-change bullets
 */
import { execFileSync, execSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(".");
const require = createRequire(import.meta.url);
const { parseSemver, isNewer } = require(path.join(root, "desktop-app/src/semver.js"));

const checkOnly = process.argv.includes("--check");
const doStage = process.argv.includes("--stage");
const backfillDates = process.argv.includes("--backfill-dates");
const prevRef = String(process.env.PREV_REF || "").trim();
const releasePath = process.env.SHIELD_RELEASE_MD
  ? path.resolve(process.env.SHIELD_RELEASE_MD)
  : path.join(root, "desktop-app/RELEASE.md");
const marker = "<!-- __MIN_SUPPORTED_BUMP_NOTES__ -->";

function stageReleaseMd() {
  if (!doStage) {
    console.log(
      "[inject-min-bump-release] next: git add desktop-app/RELEASE.md  (or re-run with --stage)"
    );
    return;
  }
  try {
    // Only stage when the index is clean (no already-staged paths) so we do not
    // mix RELEASE.md into an unrelated partial commit.
    const porcelain = execSync("git status --porcelain", {
      cwd: root,
      encoding: "utf8"
    });
    const hasStaged = porcelain
      .split("\n")
      .filter(Boolean)
      .some((line) => line[0] !== " " && line[0] !== "?");
    if (hasStaged) {
      console.warn(
        "[inject-min-bump-release] index not clean — skip --stage; run: git add desktop-app/RELEASE.md"
      );
      return;
    }
    execSync("git add desktop-app/RELEASE.md", { cwd: root, stdio: "inherit" });
    console.log("[inject-min-bump-release] staged desktop-app/RELEASE.md");
  } catch (err) {
    console.error(
      "[inject-min-bump-release] git add failed:",
      err instanceof Error ? err.message : err
    );
    process.exit(1);
  }
}

/** Blame ISO date (YYYY-MM-DD) for a 1-based line in RELEASE.md (fixture paths skip blame). */
function blameIsoForLine(lineNum) {
  if (process.env.SHIELD_BACKFILL_FIXTURE === "1") {
    return process.env.SHIELD_BACKFILL_FIXTURE_ISO || "2026-01-15";
  }
  try {
    const rel = path.relative(root, releasePath) || "desktop-app/RELEASE.md";
    const out = execFileSync(
      "git",
      ["blame", "-L", `${lineNum},${lineNum}`, "--porcelain", "--", rel],
      { cwd: root, encoding: "utf8", maxBuffer: 2_000_000 }
    );
    const m = out.match(/^author-time (\d+)/m);
    if (!m) return null;
    return new Date(Number(m[1]) * 1000).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

if (backfillDates) {
  let md = readFileSync(releasePath, "utf8");
  const lines = md.split(/\n/);
  let changed = 0;
  // Bullets like: - **0.2.0** (initial): …  or  - **0.2.0** (vs 0.1.0): …
  // Skip those that already have an ISO date after the first "(".
  const bulletRe =
    /^(- \*\*\d+\.\d+\.\d+\*\* )\((?!(\d{4}-\d{2}-\d{2}))([^)]*)\)(:.*)$/;
  /** @type {string[]} */
  const changedList = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(bulletRe);
    if (!m) continue;
    const iso = blameIsoForLine(i + 1) || new Date().toISOString().slice(0, 10);
    const tag = m[3].trim(); // e.g. initial | vs 0.1.0
    lines[i] = `${m[1]}(${iso}, ${tag})${m[4]}`;
    changed += 1;
    changedList.push(lines[i]);
  }
  if (!changed) {
    console.log("[inject-min-bump-release] --backfill-dates: nothing to update");
    process.exit(0);
  }
  const next = lines.join("\n");
  if (checkOnly) {
    if (next !== md) {
      console.error("[inject-min-bump-release] --backfill-dates drift — run without --check");
      console.error("[inject-min-bump-release] would change:");
      for (const row of changedList) console.error(`  ${row}`);
      const summaryPath = process.env.GITHUB_STEP_SUMMARY;
      if (summaryPath && process.env.GITHUB_ACTIONS === "true") {
        try {
          const bullets = changedList.map((row) => `- \`${row}\``).join("\n");
          appendFileSync(
            summaryPath,
            `\n### inject --backfill-dates --check would change\n\n${bullets}\n`
          );
        } catch (e) {
          const msg = e && typeof e === "object" && "message" in e ? e.message : e;
          console.warn("[inject-min-bump-release] GITHUB_STEP_SUMMARY append soft-fail:", msg);
        }
      }
      process.exit(1);
    }
    console.log("[inject-min-bump-release] --backfill-dates OK");
    process.exit(0);
  }
  writeFileSync(releasePath, next);
  console.log(`[inject-min-bump-release] --backfill-dates updated ${changed} bullet(s):`);
  for (const row of changedList) console.log(`  ${row}`);
  stageReleaseMd();
  process.exit(0);
}

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
stageReleaseMd();
