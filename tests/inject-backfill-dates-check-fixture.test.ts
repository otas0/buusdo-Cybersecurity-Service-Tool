/**
 * inject --backfill-dates --check on undated bullets writes CI summary path.
 *
 *   node --test tests/inject-backfill-dates-check-fixture.test.ts
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(".");

test("inject --backfill-dates --check annotates undated bullets in summary", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-inject-bf-"));
  const release = path.join(dir, "RELEASE.md");
  const summary = path.join(dir, "summary.md");
  writeFileSync(
    release,
    `# Release\n\n<!-- __MIN_SUPPORTED_BUMP_NOTES__ -->\n\n- **0.2.0** (initial): floor note without ISO date yet.\n`,
    "utf8"
  );
  writeFileSync(summary, "", "utf8");
  try {
    let failed = false;
    try {
      execFileSync(
        process.execPath,
        ["scripts/inject-desktop-min-bump-release-note.mjs", "--backfill-dates", "--check"],
        {
          cwd: root,
          encoding: "utf8",
          env: {
            ...process.env,
            SHIELD_RELEASE_MD: release,
            SHIELD_BACKFILL_FIXTURE: "1",
            SHIELD_BACKFILL_FIXTURE_ISO: "2026-01-15",
            GITHUB_ACTIONS: "true",
            GITHUB_STEP_SUMMARY: summary
          }
        }
      );
    } catch (err) {
      failed = true;
      const status =
        err && typeof err === "object" && "status" in err ? Number(err.status) : 1;
      assert.equal(status, 1, "expected --check drift exit 1");
    }
    assert.equal(failed, true, "expected --check to fail on undated bullet");
    const md = readFileSync(summary, "utf8");
    assert.match(md, /### inject --backfill-dates --check would change/);
    assert.match(md, /\*\*0\.2\.0\*\* \(2026-01-15, initial\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
