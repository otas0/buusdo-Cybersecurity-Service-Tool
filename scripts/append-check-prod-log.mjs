#!/usr/bin/env node
/**
 * Append a row to docs/LAUNCH_CHECKLIST.md § check:prod log.
 *
 *   node scripts/append-check-prod-log.mjs --url https://… --result OK --runner github-actions
 *   node scripts/append-check-prod-log.mjs --url https://… --result FAIL --runner github-actions --notes "…"
 */
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function emitDroppedRows(n) {
  const line = `DROPPED_ROWS=${n}`;
  console.info(`[append-check-prod-log] ${line}`);
  // Actions search / annotations — always emit notice (even when 0).
  console.log(`::notice::${line}`);
  if (process.env.GITHUB_OUTPUT) {
    try {
      appendFileSync(process.env.GITHUB_OUTPUT, `dropped_rows=${n}\n`, "utf8");
    } catch {
      /* ignore */
    }
  }
}

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? String(args[i + 1] || "").trim() : "";
}

const url = flag("url") || process.env.HEALTH_BASE_URL || "";
const result = (flag("result") || "OK").toUpperCase();
const runner =
  flag("runner") ||
  (process.env.GITHUB_ACTIONS === "true" ? "github-actions" : "local");

const notes = flag("notes") || "";
const when = new Date().toISOString().slice(0, 10);

if (!url) {
  console.error("Usage: append-check-prod-log.mjs --url https://… --result OK|FAIL");
  process.exit(1);
}

const checklistPath = join(process.cwd(), "docs", "LAUNCH_CHECKLIST.md");
let md = readFileSync(checklistPath, "utf8");
const row = `| ${when} | ${runner} | **${result}** | \`${url}\`${notes ? ` — ${notes}` : ""} |`;

const marker = "### check:prod log";
const idx = md.indexOf(marker);
if (idx < 0) {
  console.error("LAUNCH_CHECKLIST.md missing ### check:prod log section");
  process.exit(1);
}

// Insert after the table header separator line (|----|...)
const after = md.slice(idx);
const tableHeaderMatch = after.match(
  /\| When \(UTC\) \| Runner \| Result \| Notes \|\n\|[-| ]+\|\n/
);
if (!tableHeaderMatch) {
  console.error("check:prod log table header not found");
  process.exit(1);
}
const insertAt = idx + tableHeaderMatch.index + tableHeaderMatch[0].length;
const nextLine = md.slice(insertAt).split("\n")[0] || "";
// Skip only an identical same-day row for the same runner (allow multiple OK rows/day).
if (
  nextLine.includes(url) &&
  nextLine.includes(when) &&
  nextLine.includes(`**${result}**`) &&
  nextLine.includes(runner)
) {
  console.info("[append-check-prod-log] row already present — skip");
  emitDroppedRows(0);
  process.exit(0);
}
md = `${md.slice(0, insertAt)}${row}\n${md.slice(insertAt)}`;

// Cap table body so privacy-china notes stay readable (default 40 data rows).
const maxRows = Math.max(
  5,
  Number.parseInt(process.env.CHECKLIST_LOG_MAX_ROWS || flag("max-rows") || "40", 10) || 40
);
const tableStart = insertAt;
const afterTable = md.slice(tableStart);
const lines = afterTable.split("\n");
const dataRows = [];
let restIdx = 0;
for (; restIdx < lines.length; restIdx += 1) {
  const line = lines[restIdx];
  if (/^\| /.test(line) && !/^\|[-| ]+\|$/.test(line) && !/When \(UTC\)/.test(line)) {
    dataRows.push(line);
    continue;
  }
  break;
}
let dropped = 0;
if (dataRows.length > maxRows) {
  const kept = dataRows.slice(0, maxRows);
  dropped = dataRows.length - maxRows;
  const remainder = lines.slice(restIdx).join("\n");
  md = md.slice(0, tableStart) + kept.join("\n") + "\n" + remainder;
  console.info(`[append-check-prod-log] capped table to ${maxRows} rows (dropped ${dropped})`);
}

writeFileSync(checklistPath, md, "utf8");
console.info(`[append-check-prod-log] ${row}`);
emitDroppedRows(dropped);