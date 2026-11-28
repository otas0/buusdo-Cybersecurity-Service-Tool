/**
 * TRACKER_COPY must cover core extension-ui-locales catalog ids.
 *
 *   npx tsx --test tests/tracker-langselect-parity.test.ts
 */
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

test("TRACKER_COPY covers every core extension-ui-locales catalog locale", () => {
  const catalog = JSON.parse(
    readFileSync(join(root, "extension/shared/extension-ui-locales.json"), "utf8")
  ) as { order: string[] };
  assert.ok((catalog.order || []).length >= 8, `catalog too small`);

  const content = readFileSync(join(root, "extension/content/content.js"), "utf8");
  const tracker = trackerLocales(content);
  for (const id of [
    "en",
    "pt-PT",
    "zh-Hans",
    "zh-Hant",
    "ja",
    "mi",
    "th",
    "vi",
    "de",
    "fr",
    "es",
    "it",
    "nl",
    "af",
    "zu"
  ]) {
    assert.ok(tracker.includes(id), `TRACKER_COPY missing catalog locale ${id}`);
  }
});
