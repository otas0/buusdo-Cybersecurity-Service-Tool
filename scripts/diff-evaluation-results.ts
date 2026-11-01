/**
 * Diff two evaluation-results.json artifacts — report failed scenario id changes.
 *
 * Usage:
 *   npx tsx scripts/diff-evaluation-results.ts <baseline.json> <current.json>
 *
 * Exit 0 if no newly failed scenarios; exit 1 if current has failures baseline did not.
 * Writes evaluation/diff.md (Markdown table with ids + names) for PR comments / job summaries.
 *
 * When fixture/report rows omit `name`, looks up evaluation/scenarios.ts via evaluation-diff-lib.
 *
 * Smoke (expects exit 1):
 *   npm run evaluate:diff:smoke
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatDiffCell, loadFailedFromReport, type ScenarioRow } from "./evaluation-diff-lib";

function loadFailed(path: string): Map<string, string> {
  const report = JSON.parse(readFileSync(path, "utf8")) as { scenarios?: ScenarioRow[] };
  return loadFailedFromReport(report);
}

const baselinePath = resolve(process.argv[2] || "");
const currentPath = resolve(process.argv[3] || "");

if (!process.argv[2] || !process.argv[3]) {
  console.error("Usage: tsx scripts/diff-evaluation-results.ts <baseline.json> <current.json>");
  process.exit(2);
}

const baseline = loadFailed(baselinePath);
const current = loadFailed(currentPath);
const names = new Map<string, string>([...baseline, ...current]);

const newlyFailed = [...current.keys()].filter((id) => !baseline.has(id)).sort();
const newlyPassed = [...baseline.keys()].filter((id) => !current.has(id)).sort();
const stillFailed = [...current.keys()].filter((id) => baseline.has(id)).sort();

console.log("evaluation artifact diff");
console.log(`  baseline failed: ${baseline.size}`);
console.log(`  current failed:  ${current.size}`);
console.log(`  newly failed:    ${newlyFailed.length ? newlyFailed.join(", ") : "(none)"}`);
console.log(`  newly passed:    ${newlyPassed.length ? newlyPassed.join(", ") : "(none)"}`);
console.log(`  still failed:    ${stillFailed.length ? stillFailed.join(", ") : "(none)"}`);

const status = newlyFailed.length ? "❌ newly failed scenarios" : "✅ no newly failed scenarios";
const md = [
  "## Evaluation diff vs baseline",
  "",
  status,
  "",
  "| Change | Scenarios |",
  "| --- | --- |",
  `| Newly failed | ${formatDiffCell(newlyFailed, names)} |`,
  `| Newly passed | ${formatDiffCell(newlyPassed, names)} |`,
  `| Still failed | ${formatDiffCell(stillFailed, names)} |`,
  "",
  `Baseline failed: **${baseline.size}** · Current failed: **${current.size}**`,
  ""
].join("\n");

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "evaluation");
mkdirSync(outDir, { recursive: true });
const mdPath = resolve(outDir, "diff.md");
writeFileSync(mdPath, md, "utf8");
console.log(`Markdown: ${mdPath}`);

if (process.env.GITHUB_ACTIONS === "true") {
  console.log(
    `::notice::evaluation diff — newly failed: ${newlyFailed.length ? newlyFailed.join(", ") : "none"}; newly passed: ${newlyPassed.length ? newlyPassed.join(", ") : "none"}`
  );
  try {
    const summary = process.env.GITHUB_STEP_SUMMARY;
    if (summary) writeFileSync(summary, md, { flag: "a" });
  } catch {
    /* ignore */
  }
}

if (newlyFailed.length) {
  process.exitCode = 1;
}