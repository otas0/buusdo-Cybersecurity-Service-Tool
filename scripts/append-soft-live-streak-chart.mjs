/**
 * Append soft-live streak + inview-outcome chart to GITHUB_STEP_SUMMARY.
 *
 *   node scripts/append-soft-live-streak-chart.mjs
 *
 * Reads:
 *   - ci/soft-live-hash-streak.json (or SOFT_LIVE_HASH_STREAK_PATH)
 *   - ci/soft-live-hash-inview-outcome.json (or SOFT_LIVE_HASH_OUTCOME_PATH)
 */
import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const streakPath =
  process.env.SOFT_LIVE_HASH_STREAK_PATH ||
  path.join(root, "ci/soft-live-hash-streak.json");
const outcomePath =
  process.env.SOFT_LIVE_HASH_OUTCOME_PATH ||
  path.join(root, "ci/soft-live-hash-inview-outcome.json");

function readJson(p, fallback) {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

const streak = readJson(streakPath, { streak: 0, need: 3 });
const outcome = readJson(outcomePath, { ok: true, fails: [], oks: [] });
const n = Number(streak.streak) || 0;
const need = Number(streak.need) || 3;
const oks = Array.isArray(outcome.oks) ? outcome.oks.length : 0;
const fails = Array.isArray(outcome.fails) ? outcome.fails.length : 0;
const bar = "█".repeat(Math.min(n, need)) + "░".repeat(Math.max(0, need - n));

const lines = [
  "### soft-live streak chart",
  "",
  "```",
  `streak  [${bar}] ${n}/${need}  extension-ui=${n >= need ? "unpark" : "parked"}`,
  `inview  ok=${outcome.ok === true}  oks=${oks}  fails=${fails}`,
  "```",
  "",
  "```mermaid",
  "xychart-beta",
  '  title "Soft-live greens vs need"',
  `  x-axis ["streak", "need"]`,
  `  y-axis "runs" 0 --> ${Math.max(need, n, 1)}`,
  `  bar [${n}, ${need}]`,
  "```",
  ""
];

const text = lines.join("\n");
console.log(text.trimEnd());

const summary = process.env.GITHUB_STEP_SUMMARY;
if (summary) {
  try {
    appendFileSync(summary, `${text}\n`);
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? e.message : e;
    console.warn("[append-soft-live-streak-chart] summary soft-fail:", msg);
  }
}
