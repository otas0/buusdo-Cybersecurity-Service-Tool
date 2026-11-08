/**
 * China Pages soft-skip when CHINA_PAGES_BASE_URL is dead (parity with Workers privacy-prod).
 *
 *   npx tsx --test tests/china-pages-soft-skip.test.ts
 */
import assert from "node:assert/strict";
import { test } from "node:test";

async function chinaPagesReachable(base: string): Promise<{ ok: boolean; reason: string }> {
  const origin = base.replace(/\/$/, "");
  try {
    const res = await fetch(`${origin}/privacy-en.html`, {
      signal: AbortSignal.timeout(4_000),
      redirect: "follow"
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    return { ok: true, reason: "ok" };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

test("dead CHINA_PAGES_BASE_URL soft-skips (unreachable)", async () => {
  const dead = "http://127.0.0.1:1";
  const result = await chinaPagesReachable(dead);
  assert.equal(result.ok, false);
  assert.ok(result.reason, "expected unreachable reason");
  console.info(`[china-pages-soft-skip] soft-skip China Pages (${dead}): ${result.reason}`);
});

test("default China Pages origin shape is https Pages host", () => {
  const base = (process.env.CHINA_PAGES_BASE_URL || "https://otas0.github.io/buusdocst").replace(
    /\/$/,
    "",
  );
  assert.match(base, /^https:\/\//);
});
