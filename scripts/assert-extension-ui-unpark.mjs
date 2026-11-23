/**
 * Gate extension UI changes until soft-live streak reaches unpark.
 *
 *   node scripts/assert-extension-ui-unpark.mjs
 *   node scripts/assert-extension-ui-unpark.mjs --diff-base origin/main
 *
 * Passes when:
 *   - no extension UI paths in the diff, or
 *   - ci/soft-live-hash-streak.json (or SOFT_LIVE_HASH_GREEN_STREAK) says extension-ui=unpark
 *
 * Soft-skip (exit 0) when EXT_UI_UNPARK_SKIP=1.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.env.EXT_UI_UNPARK_SKIP === "1") {
  console.info("[assert-extension-ui-unpark] skipped (EXT_UI_UNPARK_SKIP=1)");
  process.exit(0);
}

const NEED = 3;
const streakPath =
  process.env.SOFT_LIVE_HASH_STREAK_PATH ||
  path.join(root, "ci/soft-live-hash-streak.json");

/**
 * UI polish surfaces under extension/ — README/docs/json and i18n sync overlays
 * do not trip the gate (popup/options/content CSS+HTML+JS do).
 */
function isExtensionUiPath(f) {
  if (!f.startsWith("extension/")) return false;
  if (/\.(md|json)$/i.test(f)) return false;
  if (/i18n/i.test(f)) return false;
  if (/\/(popup|options|content|page)\//i.test(f)) return true;
  if (/\.(css|html|svg|png)$/i.test(f)) return true;
  // Top-level extension chrome JS (popup.js etc.) — not shared sync bags.
  if (/^extension\/[^/]+\.(js|css|html)$/i.test(f)) return true;
  return false;
}

function readStreak() {
  const envN = Number.parseInt(String(process.env.SOFT_LIVE_HASH_GREEN_STREAK || "").trim(), 10);
  if (Number.isFinite(envN) && envN >= 0) return envN;
  try {
    if (!existsSync(streakPath)) return 0;
    const j = JSON.parse(readFileSync(streakPath, "utf8"));
    const n = Number(j.streak);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function changedFiles() {
  const baseIdx = process.argv.indexOf("--diff-base");
  const base =
    (baseIdx >= 0 && process.argv[baseIdx + 1]) ||
    process.env.EXT_UI_DIFF_BASE ||
    "";
  try {
    if (base) {
      return execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], {
        cwd: root,
        encoding: "utf8"
      })
        .split("\n")
        .filter(Boolean);
    }
    return execFileSync("git", ["diff", "--name-only", "HEAD"], {
      cwd: root,
      encoding: "utf8"
    })
      .split("\n")
      .filter(Boolean)
      .concat(
        execFileSync("git", ["diff", "--name-only", "--cached"], {
          cwd: root,
          encoding: "utf8"
        })
          .split("\n")
          .filter(Boolean)
      );
  } catch {
    return [];
  }
}

const files = [...new Set(changedFiles())];
const uiHits = files.filter((f) => isExtensionUiPath(f));
if (!uiHits.length) {
  console.info("[assert-extension-ui-unpark] OK (no extension UI paths in diff)");
  process.exit(0);
}

// Local dirty trees without --diff-base: soft-warn unless EXT_UI_STRICT=1 or CI.
const hasDiffBase =
  process.argv.includes("--diff-base") || Boolean(process.env.EXT_UI_DIFF_BASE);
if (
  !hasDiffBase &&
  process.env.GITHUB_ACTIONS !== "true" &&
  process.env.EXT_UI_STRICT !== "1"
) {
  console.warn(
    `[assert-extension-ui-unpark] soft: ${uiHits.length} UI path(s) while parked — set EXT_UI_STRICT=1 to hard-fail locally`
  );
  process.exit(0);
}

const streak = readStreak();
if (streak >= NEED) {
  console.info(
    `[assert-extension-ui-unpark] OK streak=${streak}/${NEED} extension-ui=unpark (${uiHits.length} UI file(s))`
  );
  process.exit(0);
}

console.error(
  `[assert-extension-ui-unpark] blocked: extension UI polish parked until soft-live streak>=${NEED} (have ${streak}). Files:\n  ${uiHits.join("\n  ")}`
);
console.error(
  "See extension/README.md + ci/soft-live-hash-streak.json — wait for [soft-live-hash] extension-ui=unpark in CI summary."
);
process.exit(1);
