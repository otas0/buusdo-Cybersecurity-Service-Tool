/**
 *   npx tsx --test tests/parse-china-stub-path-counts.test.ts
 */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const script = join(process.cwd(), "scripts/parse-china-stub-path-counts.mjs");

test("parse-china-stub-path-counts GATE=review on near-zero fixture", () => {
  const dump = join(process.cwd(), "tests/fixtures/china-stub-path-counts/near-zero.jsonl");
  const r = spawnSync(process.execPath, [script, "--dump", dump, "--near-zero", "5"], {
    encoding: "utf8"
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /GATE=review/);
});

test("parse-china-stub-path-counts GATE=keep on hot-stubs fixture", () => {
  const dump = join(process.cwd(), "tests/fixtures/china-stub-path-counts/hot-stubs.csv");
  const r = spawnSync(process.execPath, [script, "--dump", dump], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /GATE=keep/);
  assert.match(r.stdout, /count \/install\.html=42/);
});

test("parse-china-stub-path-counts still accepts ad-hoc dump", () => {
  const dir = mkdtempSync(join(tmpdir(), "stub-counts-"));
  const dump = join(dir, "hits.csv");
  writeFileSync(dump, "path,count\n/install.html,99\n/privacy.html,0\n", "utf8");
  const r = spawnSync(process.execPath, [script, "--dump", dump], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /GATE=keep/);
  rmSync(dir, { recursive: true, force: true });
});
