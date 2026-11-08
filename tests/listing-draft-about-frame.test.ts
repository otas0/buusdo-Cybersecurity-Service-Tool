/**
 * Chrome store listing draft must mention Desktop About FRAME.
 *
 *   npx tsx --test tests/listing-draft-about-frame.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("CHROME_STORE_LISTING_DRAFT mentions FRAME-desktop-about", () => {
  const md = readFileSync("docs/CHROME_STORE_LISTING_DRAFT.md", "utf8");
  assert.match(md, /FRAME-desktop-about\.png/);
  assert.match(md, /Desktop About/i);
  assert.match(md, /capture:desktop-about-frame/);
  const captions = md.split("## Screenshot captions")[1] || "";
  assert.match(captions, /3 — Desktop About|Desktop About footer/i);
});
