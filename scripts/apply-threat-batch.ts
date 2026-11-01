/**
 * Apply a report / false-positive batch to curated-threats.json (default)
 * or curated-threats.pt.json (--target=pt), then run regression / threat:check.
 *
 * Usage:
 *   npm run threat:apply -- security/data/batches/my-batch.json
 *   npm run threat:apply -- security/data/batches/my-batch.json --target=pt
 *   npm run threat:apply -- security/data/batches/my-batch.json --dry-run
 *   npm run threat:apply -- security/data/batches/my-batch.json --keep
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
  applyBatchToFile,
  archiveBatch,
  ensureBatchesDir,
  loadBatch,
  readCuratedFile,
  resolveCuratedTargetPath,
  resolveThreatApplyTarget,
  unknownBatchTargetWarning,
  validateCuratedFile,
  writeCuratedFile
} from "../security/curated-ops";

const PT_EVAL_TIP =
  "Next: npm run evaluate — keep EVAL-029–032 green (MERGE_PT on/off + benign lookalike). See npm run threat:check:help.";

const args = process.argv.slice(2).filter((a) => a !== "--");
const keep = args.includes("--keep");
const dryRun = args.includes("--dry-run");
const skipRegression = args.includes("--skip-regression") || dryRun;
const batchArg = args.find((a) => !a.startsWith("--"));

if (!batchArg) {
  console.error(`Usage: npm run threat:apply -- <batch.json> [--target=pt|core] [--dry-run] [--keep] [--skip-regression]

--target=pt writes security/data/curated-threats.pt.json (Portugal seeds).
Default / --target=core writes curated-threats.json.
Batch JSON may also set "target": "curated-threats.pt.json".
--dry-run prints target path + host diffs without writing or archiving.

After every list change, regression / threat:check must pass.
--skip-regression is for local dry runs only — do not commit without a green check.`);
  process.exit(1);
}

ensureBatchesDir();
const batchPath = resolve(process.cwd(), batchArg);
const batch = loadBatch(batchPath);

if (!dryRun) {
  if (batch.reviewChecklist && batch.reviewChecklist.readyToApply !== true) {
    console.error(`Batch ${batch.id} is not marked readyToApply.
Fill reviewedBy and set reviewChecklist after human review, then re-run.

Example checklist fields to set in the batch JSON:
{
  "reviewedBy": "operator-name",
  "reviewChecklist": {
    "hostsReviewed": true,
    "falsePositivesConfirmed": true,
    "readyToApply": true
  }
}

(Host counts in notes: see batch.notes)`);
    process.exit(1);
  }
  if (batch.reviewChecklist && !String(batch.reviewedBy || "").trim()) {
    console.error(`Batch ${batch.id} has an empty reviewedBy. Sign off before apply.

Set for example: "reviewedBy": "operator-name"`);
    process.exit(1);
  }
}

const unknownTarget = unknownBatchTargetWarning((batch as { target?: string }).target);
if (unknownTarget) {
  console.warn(`Warning: ${unknownTarget}`);
}

let target: ReturnType<typeof resolveThreatApplyTarget>;
try {
  target = resolveThreatApplyTarget(args, batch as { target?: string });
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

const listPath = resolveCuratedTargetPath(target);
const before = readCuratedFile(listPath);
const result = applyBatchToFile(before, batch);
const errors = validateCuratedFile(result.file);
if (errors.length) {
  // Same exit as a real apply — including --dry-run.
  console.error("Curated list validation failed:");
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

if (dryRun) {
  console.log(`DRY-RUN batch ${batch.id} (${batch.kind})`);
  console.log(`  target:  ${target}`);
  console.log(`  path:    ${listPath}`);
  console.log(`  would add:    ${result.added.length ? result.added.join(", ") : "(none)"}`);
  console.log(`  would remove: ${result.removed.length ? result.removed.join(", ") : "(none)"}`);
  if (result.skippedAdd.length) console.log(`  skip add (already same): ${result.skippedAdd.join(", ")}`);
  if (result.skippedRemove.length) console.log(`  skip remove (missing): ${result.skippedRemove.join(", ")}`);
  console.log("No write, no archive. (readyToApply checklist skipped on purpose for --dry-run)");
  if (target === "pt") console.log(PT_EVAL_TIP);
  process.exit(0);
}

writeCuratedFile(result.file, listPath);
console.log(`Applied batch ${batch.id} (${batch.kind}) → ${listPath}`);
console.log(`  target:  ${target}`);
console.log(`  added:   ${result.added.length ? result.added.join(", ") : "(none)"}`);
console.log(`  removed: ${result.removed.length ? result.removed.join(", ") : "(none)"}`);
if (result.skippedAdd.length) console.log(`  skip add (already same): ${result.skippedAdd.join(", ")}`);
if (result.skippedRemove.length) console.log(`  skip remove (missing): ${result.skippedRemove.join(", ")}`);

if (!keep) {
  const archived = archiveBatch(batchPath);
  console.log(`  archived → ${archived}`);
} else {
  console.log("  batch file kept (--keep)");
}

if (skipRegression) {
  console.warn("\nWARNING: skipped regression. Run `npm run threat:check` before commit.");
  process.exit(0);
}

const verifyScript = target === "pt" ? "threat:check" : "regression";
console.log(`\nRunning ${verifyScript} (required after curated list changes)…`);
const check = spawnSync("npm", ["run", verifyScript], {
  stdio: "inherit",
  shell: process.platform === "win32"
});
if (check.status !== 0) {
  console.error(`\n${verifyScript} failed. Revert ${listPath} or fix the batch before shipping.`);
  process.exit(check.status || 1);
}
console.log(`\nthreat:apply complete — ${target} list change + ${verifyScript} OK.`);
if (target === "pt") console.log(PT_EVAL_TIP);