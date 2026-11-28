/**
 * Client mainland fallback must location.replace to Pages (not tip-only).
 *
 *   npx tsx --test tests/china-mainland-soft-tip.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("ChinaMainlandSoftTip boots location.replace + data-testid", () => {
  const src = readFileSync("components/ChinaMainlandSoftTip.tsx", "utf8");
  assert.match(src, /location\.replace/);
  assert.match(src, /otas0\.github\.io\/buusdocst/);
  assert.match(src, /data-testid=\"china-mainland-client-redirect-boot\"/);
  assert.match(src, /china-mainland-client-redirect/);
  assert.match(src, /\/api\/geo/);
  assert.match(src, /zh-cn/);
  assert.match(src, /zh-hans/);
  assert.match(src, /Asia\\\\\/\(Shanghai/);
  assert.doesNotMatch(src, /soft tip only/i);

  const layout = readFileSync("app/layout.tsx", "utf8");
  assert.match(layout, /ChinaMainlandSoftTip/);
});
