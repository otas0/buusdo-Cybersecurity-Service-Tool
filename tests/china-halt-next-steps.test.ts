import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("China Pages index + en expose Halt next-steps section", () => {
  const root = process.cwd();
  const zh = readFileSync(join(root, "china-pages/index.html"), "utf8");
  const en = readFileSync(join(root, "china-pages/en.html"), "utf8");
  for (const src of [zh, en]) {
    assert.match(src, /data-testid="china-halt-next-steps"/);
    assert.match(src, /id="halt-next-steps"/);
    assert.match(src, /halt-steps/);
    assert.doesNotMatch(src, /survey-round2|\/survey\/|Round-2/i);
  }
  assert.match(zh, /立刻离开/);
  assert.match(en, /Leave the page now/i);
  assert.match(en, /not antivirus/i);
});

test("China privacy.html has zh Halt FAQ", () => {
  const privacy = readFileSync(join(process.cwd(), "china-pages/privacy.html"), "utf8");
  assert.match(privacy, /data-testid="china-halt-faq"/);
  assert.match(privacy, /id="halt-faq"/);
  assert.match(privacy, /杀毒软件/);
  assert.match(privacy, /投票/);
});

test("China privacy-en.html has EN Halt FAQ", () => {
  const privacy = readFileSync(join(process.cwd(), "china-pages/privacy-en.html"), "utf8");
  assert.match(privacy, /data-testid="china-halt-faq"/);
  assert.match(privacy, /Is this antivirus/i);
  assert.match(privacy, /public vote/i);
  assert.match(privacy, /data-testid="china-lang-switch"/);
});

test("extension Halt toast uses shared phishing-toast-mount", () => {
  const root = process.cwd();
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
  const html = readFileSync(join(process.cwd(), "desktop-app/public/index.html"), "utf8");
  const js = readFileSync(join(process.cwd(), "desktop-app/public/js/dashboard.js"), "utf8");
  assert.match(html, /data-testid="result-danger-level"/);
  assert.match(html, /data-testid="result-ignore-risk"/);
  assert.match(js, /setHaltSurveyBlocks/);
  assert.match(js, /dangerLevelLabel/);
});
