/**
 * China Pages notice ships region-redirect hint (Europe-full hint retired with product pages).
 *
 *   npx tsx --test tests/china-europe-packs-full-hint.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("index + en.html expose china-region-redirect-hint as .hint", () => {
  for (const page of ["china-pages/index.html", "china-pages/en.html"]) {
    const html = readFileSync(page, "utf8");
    assert.match(html, /data-testid="china-region-redirect-hint"/);
    assert.match(
      html,
      /class="hint"[^>]*data-testid="china-region-redirect-hint"|data-testid="china-region-redirect-hint"[^>]*class="hint"|class="hint" data-testid="china-region-redirect-hint"/
    );
    assert.doesNotMatch(html, /china-europe-packs-full/);
  }
});
