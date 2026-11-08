/**
 * Unit assert: china-pages on-light wordmark carries charcoal #545454 (no live Pages).
 *
 *   npx tsx --test tests/china-on-light-charcoal.test.ts
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import sharp from "sharp";

const root = process.cwd();
const file = path.join(root, "china-pages/assets/buusdo-wordmark-on-light.png");

test("china-pages on-light wordmark has charcoal #545454 u-card (no Halt orange)", async () => {
  assert.ok(existsSync(file), "missing china-pages/assets/buusdo-wordmark-on-light.png");
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let charcoal = 0;
  let orange = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 200) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (Math.abs(r - 84) <= 14 && Math.abs(g - 84) <= 14 && Math.abs(b - 84) <= 14) charcoal += 1;
    if (r >= 160 && g <= 120 && b <= 60 && r > g + 40 && r > b + 80) orange += 1;
  }
  assert.ok(charcoal >= 200, `china on-light charcoal #545454 missing (charcoal=${charcoal})`);
  assert.ok(orange <= 40, `china on-light must not use Halt orange (orange=${orange})`);
});
