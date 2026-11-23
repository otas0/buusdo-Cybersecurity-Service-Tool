/**
 * Append check:desktop summary + min-supported.nsh assert + sync force locale count
 * + CORE tip-key count + soft-live consecutive-green stub to GITHUB_STEP_SUMMARY.
 * Soft-warn (exit 0) if the summary parent path cannot be created (e.g. /dev/null/…).
 *
 *   node scripts/append-check-desktop-summary.mjs
 *
 * Soft-live streak (extension unpark gate):
 *   - SOFT_LIVE_HASH_GREEN_STREAK env, else
 *   - ci/soft-live-hash-streak.json (persisted by bump-soft-live-hash-streak.mjs / CI artifact)
 * Extension UI polish stays parked until streak >= 3 (docs/I18N.md, extension/README.md).
 *
 * When SOFT_LIVE_HASH_PERSIST=1 and env streak is set, writes ci/soft-live-hash-streak.json.
 */

import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const line =
  "check:desktop tsx: tests/focus-gate-bare-focus.test.ts tests/spa-replace-state-hashchange.test.ts tests/home-continue-stamp-tag-only.test.ts";

/** Known CORE tip keys (keep in lockstep with i18n/core-keys.ts + DESKTOP_TIP_KEYS). */
const CORE_TIP_KEYS = [
  "optionalUpdateShowHint",
  "optionalUpdateTipAvailable",
  "honestLimitsMinSupportedNote"
];

const SOFT_LIVE_UNPARK_NEED = 3;
const streakPath =
  process.env.SOFT_LIVE_HASH_STREAK_PATH ||
  path.join(root, "ci/soft-live-hash-streak.json");

/** Re-run nsh assert for summary (soft-skip when file absent — same as check:desktop). */
function nshSummaryLine() {
  try {
    return execFileSync(process.execPath, ["scripts/assert-min-supported-nsh.mjs"], {
      cwd: root,
      encoding: "utf8"
    }).trim();
  } catch (err) {
    const out =
      err && typeof err === "object" && "stdout" in err
        ? String(err.stdout || "")
        : "";
    const msg = err instanceof Error ? err.message : String(err);
    return (out || msg).trim() || "[assert-min-supported-nsh] failed";
  }
}

/** Sync force-key locale count (from --check OK line). */
function syncForceLocaleSummary() {
  try {
    const out = execFileSync(
      process.execPath,
      ["scripts/sync-desktop-i18n-from-packs.mjs", "--check"],
      { cwd: root, encoding: "utf8" }
    );
    const m = out.match(/locales=(\d+)/) || out.match(/force keys: ([^)]+)/);
    if (m && m[1] && /^\d+$/.test(m[1])) {
      return `[sync-desktop-i18n] force locales=${m[1]}`;
    }
    if (m && m[1]) {
      const n = m[1].split(",").filter(Boolean).length;
      return `[sync-desktop-i18n] force locales=${n}`;
    }
    return "[sync-desktop-i18n] OK";
  } catch (err) {
    const out =
      err && typeof err === "object" && "stdout" in err
        ? String(err.stdout || "")
        : "";
    const stderr =
      err && typeof err === "object" && "stderr" in err
        ? String(err.stderr || "")
        : "";
    const msg = err instanceof Error ? err.message : String(err);
    return (stderr || out || msg).trim().slice(0, 400) || "[sync-desktop-i18n] failed";
  }
}

/** CORE tip-key count from core-keys.ts (next tip only via CORE + packs). */
function tipKeyCoreSummary() {
  try {
    const core = readFileSync(path.join(root, "i18n/core-keys.ts"), "utf8");
    const present = CORE_TIP_KEYS.filter((k) => core.includes(`"${k}"`));
    return `[core-tip-keys] count=${present.length} (${present.join(",")})`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `[core-tip-keys] failed: ${msg}`;
  }
}

function readStreakFromFile() {
  try {
    const j = JSON.parse(readFileSync(streakPath, "utf8"));
    const n = Number(j.streak);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * Soft-live hash green streak (extension unpark gate).
 * Prefer env; else persisted ci/soft-live-hash-streak.json from CI artifact.
 */
function softLiveGreenCounterStub() {
  const raw = String(process.env.SOFT_LIVE_HASH_GREEN_STREAK || "").trim();
  let streak;
  if (raw !== "") {
    const n = Number.parseInt(raw, 10);
    streak = Number.isFinite(n) && n >= 0 ? n : 0;
    if (process.env.SOFT_LIVE_HASH_PERSIST === "1") {
      try {
        mkdirSync(path.dirname(streakPath), { recursive: true });
        writeFileSync(
          streakPath,
          `${JSON.stringify(
            {
              streak,
              need: SOFT_LIVE_UNPARK_NEED,
              updatedAt: new Date().toISOString(),
              note: "Persisted by append-check-desktop-summary.mjs (SOFT_LIVE_HASH_PERSIST=1)."
            },
            null,
            2
          )}\n`
        );
      } catch (e) {
        const msg = e && typeof e === "object" && "message" in e ? e.message : e;
        console.warn("soft-live streak persist soft-fail:", msg);
      }
    }
  } else {
    streak = readStreakFromFile();
  }
  const parked = streak < SOFT_LIVE_UNPARK_NEED;
  return `[soft-live-hash] streak=${streak}/${SOFT_LIVE_UNPARK_NEED} extension-ui=${parked ? "parked" : "unpark"}`;
}

// Soft-live streak first so it still prints if sync --check soft-fails later.
const softLiveLine = softLiveGreenCounterStub();
console.log(softLiveLine);

let nshLine = "[assert-min-supported-nsh] skipped";
let syncLine = "[sync-desktop-i18n] skipped";
let tipLine = "[core-tip-keys] skipped";
try {
  nshLine = nshSummaryLine();
  syncLine = syncForceLocaleSummary();
  tipLine = tipKeyCoreSummary();
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn("[append-check-desktop-summary] soft catch after streak:", msg);
  console.log(softLiveLine);
}

if (process.env.GITHUB_ACTIONS === "true") {
  console.log(line);
  console.log(nshLine);
  console.log(syncLine);
  console.log(tipLine);
}

const s = process.env.GITHUB_STEP_SUMMARY;
if (s) {
  try {
    mkdirSync(path.dirname(path.resolve(s)), { recursive: true });
    appendFileSync(
      s,
      `## check:desktop\n\n${line}\n\n### min-supported.nsh\n\n\`\`\`\n${nshLine}\n\`\`\`\n\n### sync force locales\n\n\`\`\`\n${syncLine}\n\`\`\`\n\n### CORE tip keys\n\n\`\`\`\n${tipLine}\n\`\`\`\n\n### soft-live hash (extension unpark)\n\n\`\`\`\n${softLiveLine}\n\`\`\`\n`
    );
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? e.message : e;
    console.warn("check:desktop: GITHUB_STEP_SUMMARY mkdir/append soft-fail:", msg);
  }
}
