/**
 * GITHUB_STEP_SUMMARY under an uncreatable parent (/dev/null/…) soft-warns and exits 0;
 * writable temp path gets ## check:desktop appended.
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const script = path.resolve("scripts/append-check-desktop-summary.mjs");

test("check:desktop summary soft-fail on /dev/null parent exits 0 with warn", () => {
  const result = spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_ACTIONS: "true",
      GITHUB_STEP_SUMMARY: "/dev/null/shield-check-desktop-summary.md"
    }
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const out = `${result.stdout}\n${result.stderr}`;
  assert.match(out, /check:desktop tsx:/);
  assert.match(out, /GITHUB_STEP_SUMMARY mkdir\/append soft-fail/);
});

test("check:desktop summary happy-path appends ## check:desktop", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-check-desktop-sum-"));
  const summary = path.join(dir, "nested", "summary.md");
  try {
    const result = spawnSync(process.execPath, [script], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_ACTIONS: "true",
        GITHUB_STEP_SUMMARY: summary
      }
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const body = readFileSync(summary, "utf8");
    assert.match(body, /^## check:desktop\n/m);
    assert.match(body, /check:desktop tsx:/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});