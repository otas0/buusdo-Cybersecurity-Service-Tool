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

test("parse-china-stub-path-counts GATE=review when stubs near zero", () => {
  const dir = mkdtempSync(join(tmpdir(), "stub-counts-"));
  const dump = join(dir, "hits.jsonl");
  writeFileSync(
    dump,
    [
      JSON.stringify({ path: "/install.html", count: 0 }),
      JSON.stringify({ path: "/privacy.html", count: 1 }),
      JSON.stringify({ ClientRequestURI: "/buusdocst/install-en.html", count: 0 })
    ].join("\n"),
    "utf8"
  );
  const r = spawnSync(process.execPath, [script, "--dump", dump, "--near-zero", "5"], {
    encoding: "utf8"
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /GATE=review/);
  rmSync(dir, { recursive: true, force: true });
});

test("parse-china-stub-path-counts GATE=keep when stubs hot", () => {
  const dir = mkdtempSync(join(tmpdir(), "stub-counts-"));
  const dump = join(dir, "hits.csv");
  writeFileSync(dump, "path,count\n/install.html,99\n/privacy.html,0\n", "utf8");
  const r = spawnSync(process.execPath, [script, "--dump", dump], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /GATE=keep/);
  assert.match(r.stdout, /count \/install\.html=99/);
  rmSync(dir, { recursive: true, force: true });
});
