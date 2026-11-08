#!/usr/bin/env node
/**
 * Compare Round-2 survey CSV clicked_bad=not_sure share to Round-1 baseline (25%).
 *
 *   node scripts/survey-round2-compare.mjs path/to/round2.csv
 *
 * Exit 0 always (analysis helper). Prints PASS/FAIL vs target ≤15% and delta vs 25% baseline.
 */
import { readFileSync, existsSync } from "node:fs";
import { parse } from "node:path";

const ROUND1_NOT_SURE_SHARE = 13 / 53; // ≈ 0.2453
const ROUND2_TARGET_MAX = 0.15;

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node scripts/survey-round2-compare.mjs <round2.csv>");
  console.error("Round-1 baseline: clicked_bad=not_sure 13/53 ≈ 24.5% (target Round-2 ≤ 15%).");
  console.error("When CSV lands, see docs/SURVEY_ROUND2.md.");
  process.exit(2);
}

if (!existsSync(csvPath)) {
  console.error(`Missing CSV: ${csvPath}`);
  process.exit(2);
}

const raw = readFileSync(csvPath, "utf8");
const lines = raw.split(/\r?\n/).filter((l) => l.trim());
if (lines.length < 2) {
  console.error("CSV has no data rows");
  process.exit(2);
}

const header = splitCsvLine(lines[0]);
const col = header.findIndex((h) => h.trim().toLowerCase() === "clicked_bad");
if (col < 0) {
  console.error("CSV missing clicked_bad column");
  process.exit(2);
}

const counts = { yes: 0, no: 0, not_sure: 0, other: 0 };
let n = 0;
for (const line of lines.slice(1)) {
  const cells = splitCsvLine(line);
  if (!cells.length || cells.every((c) => !c.trim())) continue;
  n += 1;
  const v = (cells[col] || "").trim().toLowerCase();
  if (v === "yes") counts.yes += 1;
  else if (v === "no") counts.no += 1;
  else if (v === "not_sure" || v === "not sure") counts.not_sure += 1;
  else counts.other += 1;
}

const share = n ? counts.not_sure / n : 0;
const deltaPp = (share - ROUND1_NOT_SURE_SHARE) * 100;
const vsTarget = share <= ROUND2_TARGET_MAX ? "PASS" : "FAIL";

console.log(`file: ${parse(csvPath).base}`);
console.log(`n=${n} clicked_bad: yes=${counts.yes} no=${counts.no} not_sure=${counts.not_sure} other=${counts.other}`);
console.log(
  `not_sure share: ${(share * 100).toFixed(1)}% (Round-1 baseline ${(ROUND1_NOT_SURE_SHARE * 100).toFixed(1)}%, Δ ${deltaPp >= 0 ? "+" : ""}${deltaPp.toFixed(1)} pp)`
);
console.log(`vs Round-2 target ≤${(ROUND2_TARGET_MAX * 100).toFixed(0)}%: ${vsTarget}`);
if (header.includes("saw_step_by_step") || header.includes("saw_next_steps")) {
  const stepCol = header.findIndex((h) =>
    ["saw_step_by_step", "saw_next_steps"].includes(h.trim().toLowerCase())
  );
  if (stepCol >= 0) {
    const step = { yes: 0, no: 0, not_shown: 0, other: 0 };
    for (const line of lines.slice(1)) {
      const cells = splitCsvLine(line);
      if (!cells.length) continue;
      const v = (cells[stepCol] || "").trim().toLowerCase();
      if (v === "yes") step.yes += 1;
      else if (v === "no") step.no += 1;
      else if (v === "not_shown") step.not_shown += 1;
      else step.other += 1;
    }
    console.log(
      `saw_step_by_step: yes=${step.yes} no=${step.no} not_shown=${step.not_shown} other=${step.other}`
    );
  }
}

/** Minimal CSV split (handles quoted commas). */
function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQ = !inQ;
      }
      continue;
    }
    if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}
