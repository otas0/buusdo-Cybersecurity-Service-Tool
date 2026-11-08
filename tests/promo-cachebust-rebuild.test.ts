/**
 * PROMO_CACHEBUST_REBUILD must force a regen path when poster HTML / .cachebust lag.
 *
 *   npx tsx --test tests/promo-cachebust-rebuild.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";

test("assert-promo-cachebust documents PROMO_CACHEBUST_REBUILD=1 regen gate", () => {
  const src = readFileSync("scripts/assert-promo-cachebust.mjs", "utf8");
  assert.match(src, /PROMO_CACHEBUST_REBUILD/);
  assert.match(src, /process\.env\.PROMO_CACHEBUST_REBUILD !== "1"/);
  assert.match(src, /\.cachebust/);
  assert.match(src, /poster\.html/);
});

test("committed public/promo/.cachebust matches poster ?v=", () => {
  assert.ok(existsSync("public/promo/.cachebust"), "missing .cachebust");
  assert.ok(existsSync("public/promo/poster.html"), "missing poster.html");
  const v = readFileSync("public/promo/.cachebust", "utf8").trim();
  const poster = readFileSync("public/promo/poster.html", "utf8");
  assert.ok(v.length >= 8, "cachebust too short");
  assert.match(poster, new RegExp(`\\?v=${v}`));
});
