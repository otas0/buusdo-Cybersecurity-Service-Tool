import test from "node:test";
import assert from "node:assert/strict";
import {
  parseRetryAfterSec,
  resolveRetryAfterSec,
  retryAfterHeaderPreferred,
  retryAfterPreferenceDeltaSec
} from "../security/retry-after";

test("parseRetryAfterSec accepts delta-seconds", () => {
  assert.equal(parseRetryAfterSec("12"), 12);
  assert.equal(parseRetryAfterSec("0"), 1);
});

test("parseRetryAfterSec accepts HTTP-date", () => {
  const future = new Date(Date.now() + 45_000).toUTCString();
  const sec = parseRetryAfterSec(future);
  assert.ok(sec >= 40 && sec <= 50, `got ${sec}`);
});

test("parseRetryAfterSec HTTP-date slightly in the past uses fallback (clock skew)", () => {
  const past = new Date(Date.now() - 1500).toUTCString();
  assert.equal(parseRetryAfterSec(past, 60), 60);
});

test("parseRetryAfterSec falls back on garbage", () => {
  assert.equal(parseRetryAfterSec("nope", 60), 60);
  assert.equal(parseRetryAfterSec(null, 30), 30);
});

test("resolveRetryAfterSec header wins when disagree by more than 2s", () => {
  assert.equal(resolveRetryAfterSec(40, 10, 60), 40);
  assert.equal(resolveRetryAfterSec(12, 11, 60), 11);
  assert.equal(resolveRetryAfterSec(-1, 25, 60), 25);
  assert.equal(resolveRetryAfterSec(18, undefined, 60), 18);
  assert.equal(resolveRetryAfterSec(-1, undefined, 60), 60);
});

test("retryAfterHeaderPreferred matches >2s rule", () => {
  assert.equal(retryAfterHeaderPreferred(40, 10), true);
  assert.equal(retryAfterHeaderPreferred(12, 11), false);
  assert.equal(retryAfterHeaderPreferred(-1, 10), false);
});

test("AppShell 429 path: header preferred then countdown uses header", () => {
  // Mirrors website AppShell: parse Retry-After, prefer header when |Δ| > 2, then countdown.
  const headerSec = parseRetryAfterSec("40", -1);
  const jsonSec = 10;
  assert.equal(retryAfterHeaderPreferred(headerSec, jsonSec), true);
  assert.equal(resolveRetryAfterSec(headerSec, jsonSec, 60), 40);
  const codes = retryAfterHeaderPreferred(headerSec, jsonSec)
    ? ["rate-limited-header-preferred", "rate-limited"]
    : ["rate-limited"];
  assert.deepEqual(codes, ["rate-limited-header-preferred", "rate-limited"]);
});

test("retryAfterPreferenceDeltaSec exposes |header − JSON| for diagnostics", () => {
  assert.equal(retryAfterPreferenceDeltaSec(40, 10), 30);
  assert.equal(retryAfterPreferenceDeltaSec(12, 11), 1);
  assert.equal(retryAfterPreferenceDeltaSec(-1, 10), null);
});