/**
 * Tiny zip under the 55MB floor must fail assert-desktop-pack-express.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

const repo = path.resolve(".");
const script = path.join(repo, "scripts/assert-desktop-pack-express.mjs");

test("mac zip under 55MB floor fails assert-desktop-pack-express", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-express-floor-"));
  const zipPath = path.join(dir, "tiny.zip");
  try {
    // Minimal valid zip (stored empty file) — far below 55_000_000 bytes.
    writeFileSync(
      zipPath,
      Buffer.from(
        "504b03040a0000000000000000000000000000000000000000000000000000000000000000" +
          "504b01021e030a000000000000000000000000000000000000000000000000000000000000" +
          "00000000000000000000504b05060000000000000000000000000000",
        "hex"
      )
    );
    const run = spawnSync(process.execPath, [script], {
      env: { ...process.env, SHIELD_PACK_EXPRESS_ZIP: zipPath },
      encoding: "utf8"
    });
    assert.notEqual(run.status, 0, "expected non-zero exit for undersized zip");
    assert.match(
      `${run.stderr || ""}${run.stdout || ""}`,
      /55[ _]?\d{0,3}|55000000|missing node_modules|likely missing/i
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
