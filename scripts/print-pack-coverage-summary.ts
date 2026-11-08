/**
 * Thin re-export for typecheck consumers — CI uses the .mjs entry.
 *   npx tsx scripts/print-pack-coverage-summary.ts
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const r = spawnSync(process.execPath, [path.join(root, "scripts/print-pack-coverage-summary.mjs")], {
  encoding: "utf8"
});
if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
process.exit(r.status ?? 1);
