/**
 * Listing FRAME zip must unpack with Desktop About (no A4 footer control).
 *
 *   npx tsx --test tests/listing-frames-about-unpack.test.ts
 *
 * Prefers dist/chrome-webstore/*-listing-frames.zip when present; otherwise
 * asserts capture source + draft still require FRAME-desktop-about.png.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

test("FRAME-desktop-about capture exists and index has no A4 footer", () => {
  assert.ok(existsSync("docs/store-screenshots/FRAME-desktop-about.png"));
  const html = readFileSync("desktop-app/public/index.html", "utf8");
  assert.doesNotMatch(html, /foot-a4-poster|footA4Poster|\/promo\/poster\.html/);
  assert.match(html, /data-testid="foot-about"/);
  const capture = readFileSync("scripts/capture-desktop-about-frame.mjs", "utf8");
  assert.match(capture, /foot-about/);
  assert.doesNotMatch(capture, /foot-a4|A4 poster/);
});

test("listing-frames.zip unpacks About FRAME when artifact present", () => {
  const dir = "dist/chrome-webstore";
  if (!existsSync(dir)) {
    assert.ok(existsSync("docs/store-screenshots/FRAME-desktop-about.png"));
    return;
  }
  const zips = readdirSync(dir).filter((n) => n.endsWith("-listing-frames.zip"));
  if (!zips.length) {
    assert.ok(existsSync("docs/store-screenshots/FRAME-desktop-about.png"));
    return;
  }
  const zip = path.join(dir, zips.sort().at(-1) as string);
  const out = mkdtempSync(path.join(tmpdir(), "listing-frames-"));
  try {
    execFileSync("unzip", ["-qq", "-o", zip, "-d", out], { stdio: "pipe" });
    const files = readdirSync(out, { recursive: true }).map(String);
    assert.ok(
      files.some((f) => f.endsWith("FRAME-desktop-about.png")),
      `About FRAME missing in ${zip}: ${files.join(", ")}`
    );
    assert.ok(!files.some((f) => /a4|poster/i.test(f) && f.endsWith(".png")), "unexpected A4 frame in zip");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
