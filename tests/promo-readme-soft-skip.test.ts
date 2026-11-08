/**
 * Promo README soft-skip section must survive build:promo-posters.
 *
 *   npx tsx --test tests/promo-readme-soft-skip.test.ts
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = process.cwd();

test("build:promo-posters keeps offline soft-skip docs in promo README", () => {
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", path.join(root, "scripts/build-promo-posters.mjs")],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(run.status, 0, run.stderr || run.stdout || "build failed");

  for (const rel of ["docs/promo/README.md", "public/promo/README.md"]) {
    const md = readFileSync(path.join(root, rel), "utf8");
    assert.match(md, /Offline soft-skip/i, rel);
    assert.match(md, /assert:promo-privacy-routes/, rel);
    assert.match(md, /soft-skips/i, rel);
    assert.match(md, /privacy-fixture-no-survey/, rel);
    assert.match(md, /poster-pt\.html/, rel);
  }
});
