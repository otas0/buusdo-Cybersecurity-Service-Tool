/**
 * China Pages Europe-full hint stays bilingual + class="hint" (AA path).
 *
 *   npx tsx --test tests/china-europe-packs-full-hint.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("index + en.html expose china-europe-packs-full as .hint", () => {
  for (const page of ["china-pages/index.html", "china-pages/en.html"]) {
    const html = readFileSync(page, "utf8");
    assert.match(html, /data-testid="china-europe-packs-full"/);
    assert.match(
      html,
      /class="hint"[^>]*data-testid="china-europe-packs-full"|data-testid="china-europe-packs-full"[^>]*class="hint"|class="hint" data-testid="china-europe-packs-full"/
    );
  }
  const zh = readFileSync("china-pages/index.html", "utf8");
  const en = readFileSync("china-pages/en.html", "utf8");
  const zhHint = zh.match(
    /data-testid="china-europe-packs-full"[^>]*>([\s\S]*?)<\/p>/
  )?.[1];
  const enHint = en.match(
    /data-testid="china-europe-packs-full"[^>]*>([\s\S]*?)<\/p>/
  )?.[1];
  assert.ok(zhHint?.includes("完整包") || zhHint?.includes("欧洲"), "zh hint must mention full Europe packs");
  assert.ok(
    /full|Europe|thin-Europe|partial/i.test(enHint || ""),
    "en hint must mention Europe full packs"
  );
  assert.notEqual(zhHint?.trim(), enHint?.trim(), "hints must stay bilingual (not identical)");
});
