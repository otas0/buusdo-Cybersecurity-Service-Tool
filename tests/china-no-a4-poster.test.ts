/**
 * China Pages must not ship an A4 海报 button (poster CTA removed).
 *
 *   npx tsx --test tests/china-no-a4-poster.test.ts
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

test("china-pages HTML has zero A4 海报 / china-a4-poster CTAs", () => {
  const dir = "china-pages";
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".html")) continue;
    const html = readFileSync(path.join(dir, name), "utf8");
    assert.doesNotMatch(html, /china-a4-poster/, name);
    assert.doesNotMatch(html, /data-china-poster/, name);
    assert.doesNotMatch(html, /A4\s*海报/, name);
    assert.doesNotMatch(html, /\/promo\/poster\.html/, name);
  }
  assert.ok(!readdirSync(dir).includes("site-config.js"), "site-config.js must stay dropped");
});
