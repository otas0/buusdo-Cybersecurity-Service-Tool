/**
 * TRACKER_COPY must cover every extension popup #langSelect locale
 * (same contract as toast COPY ↔ langSelect).
 *
 *   npx tsx --test tests/tracker-langselect-parity.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function langSelectOrder(html: string): string[] {
  const block = html.match(/id="langSelect"[\s\S]*?<\/select>/);
  assert.ok(block, "langSelect missing");
  return [...block[0].matchAll(/<option\s+value="([^"]+)"/g)].map((m) => m[1]);
}

function trackerLocales(contentSrc: string): string[] {
  const block = /const TRACKER_COPY = \{([\s\S]*?)\n  \};/.exec(contentSrc)?.[1] || "";
  return [...block.matchAll(/^\s{4}(?:"([^"]+)"|([A-Za-z0-9-]+))\s*:/gm)].map(
    (m) => m[1] || m[2]
  );
}

test("TRACKER_COPY covers every #langSelect locale", () => {
  const html = readFileSync(join(root, "extension/popup/popup.html"), "utf8");
  const selectOrder = langSelectOrder(html);
  assert.ok(selectOrder.length >= 8, `langSelect too small: ${selectOrder.join(",")}`);

  const content = readFileSync(join(root, "extension/content/content.js"), "utf8");
  const tracker = trackerLocales(content);
  for (const id of selectOrder) {
    assert.ok(tracker.includes(id), `TRACKER_COPY missing langSelect locale ${id}`);
  }
});
