/**
 * Refuse committed / staged ci/soft-live-hash-streak.json with streak>0.
 * Runtime bumps are CI artifacts only — repo baseline stays 0.
 *
 *   node scripts/assert-soft-live-hash-streak-baseline.mjs
 *   node scripts/assert-soft-live-hash-streak-baseline.mjs --index   # git show :path
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = "ci/soft-live-hash-streak.json";
const useIndex = process.argv.includes("--index");

function readJson() {
  if (useIndex) {
    try {
      const out = execFileSync("git", ["show", `:${rel}`], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      });
      return JSON.parse(out);
    } catch {
      // Not in index — fall back to working tree (first commit / untracked).
      return JSON.parse(readFileSync(path.join(root, rel), "utf8"));
    }
  }
  return JSON.parse(readFileSync(path.join(root, rel), "utf8"));
}

let data;
try {
  data = readJson();
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`[assert-soft-live-hash-streak-baseline] cannot read ${rel}: ${msg}`);
  process.exit(1);
}

const streak = Number(data?.streak);
if (!Number.isFinite(streak) || streak !== 0) {
  console.error(
    `[assert-soft-live-hash-streak-baseline] ${rel} must stay streak=0 (got ${data?.streak}). ` +
      "Reset: node scripts/bump-soft-live-hash-streak.mjs --reset — do not commit CI artifact bumps."
  );
  process.exit(1);
}
console.log(`[assert-soft-live-hash-streak-baseline] OK streak=0${useIndex ? " (index)" : ""}`);
