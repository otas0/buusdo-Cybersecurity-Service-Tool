import test from "node:test";
import assert from "node:assert/strict";
import { getMessages } from "../i18n/messages";

test("errorRateLimitShort present in EN and pt-PT and omits {total}", () => {
  const en = getMessages("en");
  const pt = getMessages("pt-PT");
  assert.ok(en.errorRateLimitShort.includes("{sec}"));
  assert.ok(!en.errorRateLimitShort.includes("{total}"));
  assert.ok(pt.errorRateLimitShort.includes("{sec}"));
  assert.ok(!pt.errorRateLimitShort.includes("{total}"));
  assert.ok(en.errorRateLimit.includes("{total}"));
  assert.ok(pt.errorRateLimit.includes("{total}"));
  assert.ok(en.rateLimitTickOne);
  assert.ok(pt.rateLimitTickOne);
});

test("rateLimitTick / rateLimitTickOne differ between EN and pt-PT", () => {
  const en = getMessages("en");
  const pt = getMessages("pt-PT");
  assert.notEqual(en.rateLimitTick, pt.rateLimitTick);
  assert.notEqual(en.rateLimitTickOne, pt.rateLimitTickOne);
  assert.match(en.rateLimitTickOne, /1s remaining/);
  assert.match(pt.rateLimitTickOne, /1s restante/);
});

test("diagnostic header-preferred + last-Δ copy present in EN and pt-PT", () => {
  const en = getMessages("en");
  const pt = getMessages("pt-PT");
  assert.match(en.diagnosticRateLimitedHeaderPreferred, /Retry-After header preferred/);
  assert.match(pt.diagnosticRateLimitedHeaderPreferred, /Retry-After preferido/i);
  assert.match(en.diagnosticLastHeaderPreferred, /\{delta\}/);
  assert.match(pt.diagnosticLastHeaderPreferred, /\{delta\}/);
  assert.notEqual(en.diagnosticLastHeaderPreferred, pt.diagnosticLastHeaderPreferred);
  assert.match(
    en.diagnosticLastHeaderPreferred.replace("{delta}", "30"),
    /30s/
  );
  assert.match(
    pt.diagnosticLastHeaderPreferred.replace("{delta}", "30"),
    /30s/
  );
});