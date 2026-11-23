/**
 *   npx tsx --test tests/bump-soft-live-hash-streak.test.ts
 */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const script = join(process.cwd(), "scripts/bump-soft-live-hash-streak.mjs");

test("bump --from-artifact merges prior streak then greens", () => {
  const dir = mkdtempSync(join(tmpdir(), "soft-live-"));
  const outPath = join(dir, "soft-live-hash-streak.json");
  const prior = join(dir, "prior.json");
  writeFileSync(prior, JSON.stringify({ streak: 2, need: 3 }) + "\n");
  writeFileSync(outPath, JSON.stringify({ streak: 0, need: 3 }) + "\n");
  const r = spawnSync(
    process.execPath,
    [script, "--green", "--from-artifact", prior],
    {
      encoding: "utf8",
      env: { ...process.env, SOFT_LIVE_HASH_STREAK_PATH: outPath }
    }
  );
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /streak=3\/3/);
  assert.match(r.stdout, /extension-ui=unpark/);
  const j = JSON.parse(readFileSync(outPath, "utf8"));
  assert.equal(j.streak, 3);
  rmSync(dir, { recursive: true, force: true });
});
