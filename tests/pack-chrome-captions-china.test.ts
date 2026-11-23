/**
 * pack:chrome-store CAPTIONS.txt must mention optional China FRAMEs when listing
 * draft has 告知书 / China notice.
 *
 *   npx tsx --test tests/pack-chrome-captions-china.test.ts
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();
const draft = readFileSync(join(root, "docs/CHROME_STORE_LISTING_DRAFT.md"), "utf8");
const shotDir = join(root, "dist/chrome-webstore/listing-screenshots");
const captionsPath = join(shotDir, "CAPTIONS.txt");

test("listing draft mentions 告知书 / China notice (pack condition)", () => {
  assert.match(draft, /告知书|China notice/i);
});

test("pack:chrome-store CAPTIONS.txt includes optional China FRAME lines", () => {
  const frames = [
    "FRAME-privacy-china-notice.png",
    "FRAME-privacy-china-notice-en.png"
  ].filter((n) => existsSync(join(root, "docs/store-screenshots", n)));
  assert.ok(frames.length > 0, "expected at least one China privacy FRAME under docs/store-screenshots");

  execFileSync(process.execPath, [join(root, "scripts/pack-chrome-webstore.mjs")], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.ok(existsSync(captionsPath), "CAPTIONS.txt missing after pack:chrome-store");
  const captions = readFileSync(captionsPath, "utf8");
  assert.match(captions, /告知书|China notice/i);
  for (const name of frames) {
    assert.match(
      captions,
      new RegExp(name.replace(/\./g, "\\.")),
      `CAPTIONS.txt must mention ${name}`
    );
  }
  // Leave pack output for operators; only assert content (do not rm dist/).
  void rmSync;
});
