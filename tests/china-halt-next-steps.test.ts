/**
 * Halt next-steps live on Workers / clients — China Pages is notice-only.
 *
 *   npx tsx --test tests/china-halt-next-steps.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("China notice pages do not ship Halt next-steps section", () => {
  for (const file of ["china-pages/index.html", "china-pages/en.html"]) {
    const src = readFileSync(join(root, file), "utf8");
    assert.doesNotMatch(src, /data-testid="china-halt-next-steps"/);
    assert.match(src, /data-testid="china-notice"/);
    assert.doesNotMatch(src, /survey-round2|\/survey\/|Round-2/i);
  }
});

test("extension Halt toast uses shared phishing-toast-mount", () => {
  const mount = readFileSync(join(root, "extension/content/phishing-toast-mount.js"), "utf8");
  const content = readFileSync(join(root, "extension/content/content.js"), "utf8");
  const fixture = readFileSync(join(root, "extension/content/phishing-toast-fixture.html"), "utf8");
  const manifest = readFileSync(join(root, "extension/manifest.json"), "utf8");
  assert.match(mount, /buildPhishingToast/);
  assert.match(mount, /result-next-steps/);
  assert.match(mount, /result-ignore-risk/);
  assert.match(content, /__buusdoPhishingToastMount/);
  assert.match(content, /buildPhishingToast/);
  assert.match(fixture, /phishing-toast-mount\.js/);
  assert.match(manifest, /phishing-toast-mount\.js/);
});

test("desktop dashboard wires Halt danger-level + ignore-risk", () => {
  const html = readFileSync(join(root, "desktop-app/public/index.html"), "utf8");
  const js = readFileSync(join(root, "desktop-app/public/js/dashboard.js"), "utf8");
  assert.match(html, /data-testid="result-danger-level"/);
  assert.match(html, /data-testid="result-ignore-risk"/);
  assert.match(js, /setHaltSurveyBlocks/);
  assert.match(js, /dangerLevelLabel/);
});
