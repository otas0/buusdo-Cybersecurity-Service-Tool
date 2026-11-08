#!/usr/bin/env node
/**
 * Fail if i18n/pack-index.ts is out of date vs i18n/packs/*.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const target = join(root, "i18n/pack-index.ts");
const before = readFileSync(target, "utf8");
const run = spawnSync(process.execPath, [join(root, "scripts/gen-pack-index.mjs")], {
  cwd: root,
  encoding: "utf8"
});
if (run.status !== 0) {
  console.error(run.stderr || run.stdout || "gen-pack-index failed");
  process.exit(run.status || 1);
}
const after = readFileSync(target, "utf8");
if (before !== after) {
  writeFileSync(target, before);
  console.error(
    "[assert-pack-index] i18n/pack-index.ts drifts from packs — run: npm run gen:pack-index"
  );
  process.exit(1);
}
console.info("[assert-pack-index] OK");
