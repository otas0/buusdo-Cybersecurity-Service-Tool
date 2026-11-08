#!/usr/bin/env node
/**
 * Compare Round-2 survey CSV clicked_bad=not_sure share to Round-1 baseline (25%).
 * Segments not_sure by age=under18 and role=teacher.
 *
 *   node scripts/survey-round2-compare.mjs path/to/round2.csv
 *   node scripts/survey-round2-compare.mjs path/to.csv --write-md=docs/SURVEY_ROUND2.md
 *
 * Exit 0 on successful analysis. Exit 2 on usage / missing file.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { parse } from "node:path";

const ROUND1_NOT_SURE_SHARE = 13 / 53; // ≈ 0.2453
const ROUND2_TARGET_MAX = 0.15;

const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith("--"));
const writeMdArg = args.find((a) => a.startsWith("--write-md"));
const writeMdPath = writeMdArg
  ? writeMdArg.includes("=")
    ? writeMdArg.split("=").slice(1).join("=")
    : "docs/SURVEY_ROUND2.md"
  : null;

if (!csvPath) {
  console.error("Usage: node scripts/survey-round2-compare.mjs <csv> [--write-md[=docs/SURVEY_ROUND2.md]]");
  console.error("Round-1 baseline: clicked_bad=not_sure 13/53 ≈ 24.5% (target Round-2 ≤ 15%).");
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

const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
const col = header.indexOf("clicked_bad");
const ageCol = header.indexOf("age");
const roleCol = header.indexOf("role");
if (col < 0) {
  console.error("CSV missing clicked_bad column");
  process.exit(2);
}

const counts = { yes: 0, no: 0, not_sure: 0, other: 0 };
/** @type {Record<string, { n: number, not_sure: number }>} */
const segments = {
  under18: { n: 0, not_sure: 0 },
  teacher: { n: 0, not_sure: 0 },
  "not-under18": { n: 0, not_sure: 0 },
  "not-teacher": { n: 0, not_sure: 0 }
};
let n = 0;
const rows = [];
for (const line of lines.slice(1)) {
  const cells = splitCsvLine(line);
  if (!cells.length || cells.every((c) => !c.trim())) continue;
  n += 1;
  const v = (cells[col] || "").trim().toLowerCase();
  const age = ageCol >= 0 ? (cells[ageCol] || "").trim().toLowerCase() : "";
  const role = roleCol >= 0 ? (cells[roleCol] || "").trim().toLowerCase() : "";
  const isNotSure = v === "not_sure" || v === "not sure";
  if (v === "yes") counts.yes += 1;
  else if (v === "no") counts.no += 1;
  else if (isNotSure) counts.not_sure += 1;
  else counts.other += 1;

  if (age === "under18") {
    segments.under18.n += 1;
    if (isNotSure) segments.under18.not_sure += 1;
  } else if (age) {
    segments["not-under18"].n += 1;
    if (isNotSure) segments["not-under18"].not_sure += 1;
  }
  if (role === "teacher") {
    segments.teacher.n += 1;
    if (isNotSure) segments.teacher.not_sure += 1;
  } else if (role) {
    segments["not-teacher"].n += 1;
    if (isNotSure) segments["not-teacher"].not_sure += 1;
  }
  rows.push({ clicked_bad: v, age, role });
}

const share = n ? counts.not_sure / n : 0;
const deltaPp = (share - ROUND1_NOT_SURE_SHARE) * 100;
const vsTarget = share <= ROUND2_TARGET_MAX ? "PASS" : "FAIL";

function segLine(label, s) {
  const pct = s.n ? ((s.not_sure / s.n) * 100).toFixed(1) : "—";
  return `${label}: not_sure ${s.not_sure}/${s.n} (${pct}%)`;
}

const outLines = [
  `file: ${parse(csvPath).base}`,
  `n=${n} clicked_bad: yes=${counts.yes} no=${counts.no} not_sure=${counts.not_sure} other=${counts.other}`,
  `not_sure share: ${(share * 100).toFixed(1)}% (Round-1 baseline ${(ROUND1_NOT_SURE_SHARE * 100).toFixed(1)}%, Δ ${deltaPp >= 0 ? "+" : ""}${deltaPp.toFixed(1)} pp)`,
  `vs Round-2 target ≤${(ROUND2_TARGET_MAX * 100).toFixed(0)}%: ${vsTarget}`,
  segLine("segment age=under18", segments.under18),
  segLine("segment age≠under18", segments["not-under18"]),
  segLine("segment role=teacher", segments.teacher),
  segLine("segment role≠teacher", segments["not-teacher"])
];

const stepCol = header.findIndex((h) => h === "saw_step_by_step" || h === "saw_next_steps");
if (stepCol >= 0) {
  const step = { yes: 0, no: 0, not_shown: 0, other: 0 };
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    if (!cells.length) continue;
    const v = (cells[stepCol] || "").trim().toLowerCase();
    if (v === "yes") step.yes += 1;
    else if (v === "no") step.no += 1;
    else if (v === "not_shown") step.not_shown += 1;
    else if (v) step.other += 1;
  }
  outLines.push(
    `saw_step_by_step: yes=${step.yes} no=${step.no} not_shown=${step.not_shown} other=${step.other}`
  );
}

for (const line of outLines) console.log(line);

if (writeMdPath) {
  if (!existsSync(writeMdPath)) {
    console.error(`Missing markdown: ${writeMdPath}`);
    process.exit(2);
  }
  let md = readFileSync(writeMdPath, "utf8");
  const stamp = new Date().toISOString().slice(0, 10);
  const block = [
    `## Round-2 results`,
    "",
    `_Analyzed ${stamp} from \`${parse(csvPath).base}\`._`,
    "",
    "```",
    ...outLines,
    "```",
    ""
  ].join("\n");
  if (/## Round-2 results[\s\S]*?(?=\n## |\n*$)/.test(md)) {
    md = md.replace(/## Round-2 results[\s\S]*?(?=\n## |\n*$)/, block);
  } else {
    md = md.trimEnd() + "\n\n" + block;
  }
  writeFileSync(writeMdPath, md.endsWith("\n") ? md : md + "\n");
  console.log(`wrote: ${writeMdPath}`);
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
