/**
 * Slim popup China notice CTA (Workers unreachable path).
 *
 *   npx tsx --test tests/popup-china-notice-cta.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

test("popup has China notice CTA + utm_source=extension + hide manage on unreachable", () => {
  const js = readFileSync(join(root, "extension/popup/popup.js"), "utf8");
  const reach = readFileSync(join(root, "extension/popup/workers-reach.mjs"), "utf8");
  const html = readFileSync(join(root, "extension/popup/popup.html"), "utf8");
  assert.match(html, /data-testid="extension-china-notice-cta"/);
  assert.match(html, /data-testid="extension-api-unreachable"/);
  assert.match(js, /workers-reach\.mjs/);
  assert.match(js, /paintUnreachable/);
  assert.match(js, /manageListsLink/);
  assert.match(js, /probeWorkersHealth/);
  assert.match(reach, /utm_source=extension/);
  assert.match(reach, /otas0\.github\.io\/buusdocst/);
  assert.match(reach, /manageWrap\.hidden\s*=\s*true/);
  assert.match(reach, /applyUnreachableUi/);
});
