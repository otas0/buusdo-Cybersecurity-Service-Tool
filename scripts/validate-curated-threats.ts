/**
 * Validate curated threat JSON files (core + PT seeds).
 *
 * Exit codes (for CI):
 *   0 — curated lists OK
 *   1 — validation failed (dirty / invalid list — do not ship)
 *   2 — unexpected runtime error reading a file
 */
import { resolve } from "node:path";
import { readCuratedFile, validateCuratedFile, curatedPath } from "../security/curated-ops";

function validateFile(label: string, filePath: string) {
  const file = readCuratedFile(filePath);
  const errors = validateCuratedFile(file);
  const count = Object.keys(file.hosts).length;
  if (errors.length) {
    console.error(`${label}: ${errors.length} error(s), ${count} host(s)`);
    for (const err of errors) console.error(`  - ${err}`);
    return false;
  }
  console.log(`${label} OK — ${count} host(s), updatedAt=${file.updatedAt}`);
  return true;
}

try {
  const coreOk = validateFile("curated-threats.json", curatedPath());
  const ptPath = resolve(process.cwd(), "security", "data", "curated-threats.pt.json");
  const ptOk = validateFile("curated-threats.pt.json", ptPath);

  if (!coreOk || !ptOk) {
    console.error("\nthreat:validate exit 1 — fix the list or revert before commit.");
    if (process.env.GITHUB_ACTIONS === "true") {
      console.log(
        "::notice::threat:validate failed (exit 1). See npm run threat:check:help — invalid host keys or states in curated JSON."
      );
    }
    process.exit(1);
  }

  console.log("Reminder: after any list change, run `npm run regression` before commit.");
  console.log("threat:validate exit 0");
} catch (err) {
  console.error("threat:validate exit 2 — could not read curated list:");
  console.error(err instanceof Error ? err.message : err);
  if (process.env.GITHUB_ACTIONS === "true") {
    console.log("::notice::threat:validate exit 2 — cannot read curated-threats.json (or .pt.json).");
  }
  process.exit(2);
}