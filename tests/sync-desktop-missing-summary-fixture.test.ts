/**
 * sync --dry-run-missing-fixture emits CI summary markdown shape.
 *
 *   node --test tests/sync-desktop-missing-summary-fixture.test.ts
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(".");

test("sync --dry-run-missing-fixture writes locale×key summary markdown", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-sync-miss-"));
  const out = path.join(dir, "summary.md");
  try {
    execFileSync(
      process.execPath,
      ["scripts/sync-desktop-i18n-from-packs.mjs", "--dry-run-missing-fixture"],
      {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, SHIELD_SYNC_MISSING_SUMMARY_OUT: out }
      }
    );
    const md = readFileSync(out, "utf8");
    assert.match(md, /### sync-desktop-i18n missing \(locale×key\)/);
    assert.match(md, /\| locale \| key \|/);
    assert.match(md, /\| ja \| optionalUpdateShowHint \|/);
    assert.match(md, /\| de \| honestLimitsMinSupportedNote \|/);
    assert.match(md, /"syncDesktopI18nMissing"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
