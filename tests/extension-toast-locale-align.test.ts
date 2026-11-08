import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function trackerLocales(contentSrc: string): string[] {
  const block = /const TRACKER_COPY = \{([\s\S]*?)\n  \};/.exec(contentSrc)?.[1] || "";
  return [...block.matchAll(/^\s{4}(?:"([^"]+)"|([A-Za-z0-9-]+))\s*:/gm)].map(
    (m) => m[1] || m[2]
  );
}

test("content TRACKER_COPY covers toast 12-locale set", () => {
  const toast = Object.keys(
    JSON.parse(readFileSync(join(root, "extension/content/phishing-toast-i18n.json"), "utf8"))
  );
  assert.equal(toast.length, 12);
  const content = readFileSync(join(root, "extension/content/content.js"), "utf8");
  const tracker = trackerLocales(content);
  for (const id of toast) {
    assert.ok(tracker.includes(id), `TRACKER_COPY missing toast locale ${id}`);
  }
});

test("extension shared i18n has toast Halt chips for mi/th/vi (SEA overlay)", () => {
  const shared = readFileSync(join(root, "extension/shared/i18n.js"), "utf8");
  for (const id of ["en", "pt-PT", "zh-Hans", "mi", "th", "vi"]) {
    assert.match(
      shared,
      new RegExp(`(?:^|\\n)\\s{2}(?:"${id}"|${id})\\s*:`),
      `shared STRINGS missing bag ${id}`
    );
    assert.match(shared, /toastPhishing/);
  }
  assert.match(shared, /"toastPhishing":\s*"Tū"/);
  assert.match(shared, /"toastPhishing":\s*"หยุด"/);
  assert.match(shared, /"toastPhishing":\s*"Dừng"/);
  assert.match(shared, /toastPhishing:\s*"Halt"|toastPhishing:\s*"停止"|toastPhishing:\s*"Parar"/);
});
