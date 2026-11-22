/**
 * Checklist bot caps check:prod log table rows.
 *
 *   npx tsx --test tests/append-check-prod-log-cap.test.ts
 */
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  mkdirSync,
  copyFileSync
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("append-check-prod-log caps table to CHECKLIST_LOG_MAX_ROWS", () => {
  const dir = mkdtempSync(join(tmpdir(), "checklist-cap-"));
  const docs = join(dir, "docs");
  mkdirSync(docs);
  const rows = Array.from({ length: 12 }, (_, i) => {
    const d = `2026-01-${String(i + 1).padStart(2, "0")}`;
    return `| ${d} | github-actions/${i} | **OK** | \`https://example.test\` — row${i} |`;
  }).join("\n");
  writeFileSync(
    join(docs, "LAUNCH_CHECKLIST.md"),
    `# Launch\n\n### check:prod log\n\n| When (UTC) | Runner | Result | Notes |\n|------------|--------|--------|-------|\n${rows}\n\n## Next\n`,
    "utf8"
  );

  const script = join(process.cwd(), "scripts/append-check-prod-log.mjs");
  const r = spawnSync(
    process.execPath,
    [
      script,
      "--url",
      "https://example.test",
      "--result",
      "OK",
      "--runner",
      "github-actions/new",
      "--notes",
      "cap-test"
    ],
    {
      cwd: dir,
      env: { ...process.env, CHECKLIST_LOG_MAX_ROWS: "5" },
      encoding: "utf8"
    }
  );
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const out = readFileSync(join(docs, "LAUNCH_CHECKLIST.md"), "utf8");
  const dataRows = out.split("\n").filter((l) => /^\| 20\d\d-/.test(l));
  assert.equal(dataRows.length, 5);
  assert.match(out, /cap-test/);
  assert.match(r.stdout, /capped table to 5/);
  rmSync(dir, { recursive: true, force: true });
});
