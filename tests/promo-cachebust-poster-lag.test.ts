/**
 * Fail when poster.html ?v= lags the on-light wordmark hash.
 *
 *   npx tsx --test tests/promo-cachebust-poster-lag.test.ts
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = process.cwd();

test("committed poster ?v= matches on-light wordmark sha (no lag)", () => {
  const wordmark = readFileSync(path.join(root, "public/brand/buusdo-wordmark-on-light.png"));
  const expected = createHash("sha256").update(wordmark).digest("hex").slice(0, 10);
  const poster = readFileSync(path.join(root, "public/promo/poster.html"), "utf8");
  const cachebust = readFileSync(path.join(root, "public/promo/.cachebust"), "utf8").trim();
  assert.equal(cachebust, expected, `.cachebust ${cachebust} ≠ wordmark sha ${expected}`);
  assert.ok(
    poster.includes(`?v=${expected}`),
    `poster.html missing ?v=${expected} (lagging on-light hash)`,
  );
});

test("assert-promo-cachebust documents lag fail without PROMO_CACHEBUST_REBUILD", () => {
  const script = readFileSync(path.join(root, "scripts/assert-promo-cachebust.mjs"), "utf8");
  assert.match(script, /lags on-light hash/);
  assert.match(script, /PROMO_CACHEBUST_REBUILD/);
  assert.ok(existsSync(path.join(root, "public/promo/poster.html")));
});
