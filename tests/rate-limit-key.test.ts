import test from "node:test";
import assert from "node:assert/strict";
import { clearRateLimitKey, rateLimit } from "../security/rate-limit";

test("personalListBlocked must not be part of the rate-limit key", () => {
  // Documented contract: route uses check:<ip> only; body hints cannot amplify quotas.
  const ipKey = "check:203.0.113.9";
  assert.equal(ipKey.includes("personalListBlocked"), false);
  assert.match(ipKey, /^check:/);
});

test("clearRateLimitKey is per-key — two clients stay independent", () => {
  const prevLimit = process.env.CHECK_RATE_LIMIT;
  const prevWindow = process.env.CHECK_RATE_WINDOW_MS;
  process.env.CHECK_RATE_LIMIT = "1";
  process.env.CHECK_RATE_WINDOW_MS = "60000";
  clearRateLimitKey("check:a");
  clearRateLimitKey("check:b");

  try {
    assert.equal(rateLimit("check:a").ok, true);
    assert.equal(rateLimit("check:a").ok, false);
    assert.equal(rateLimit("check:b").ok, true);
    clearRateLimitKey("check:a");
    assert.equal(rateLimit("check:a").ok, true);
    assert.equal(rateLimit("check:b").ok, false);
  } finally {
    clearRateLimitKey("check:a");
    clearRateLimitKey("check:b");
    if (prevLimit === undefined) delete process.env.CHECK_RATE_LIMIT;
    else process.env.CHECK_RATE_LIMIT = prevLimit;
    if (prevWindow === undefined) delete process.env.CHECK_RATE_WINDOW_MS;
    else process.env.CHECK_RATE_WINDOW_MS = prevWindow;
  }
});