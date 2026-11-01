#!/usr/bin/env node
/**
 * Append a row to docs/LAUNCH_CHECKLIST.md § check:prod log.
 *
 *   node scripts/append-check-prod-log.mjs --url https://… --result OK --runner github-actions
 *   node scripts/append-check-prod-log.mjs --url https://… --result FAIL --runner github-actions --notes "…"
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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
if (nextLine.includes(url) && nextLine.includes(when) && nextLine.includes(result)) {
  console.info("[append-check-prod-log] row already present — skip");
  process.exit(0);
}
md = `${md.slice(0, insertAt)}${row}\n${md.slice(insertAt)}`;
writeFileSync(checklistPath, md, "utf8");
console.info(`[append-check-prod-log] ${row}`);
