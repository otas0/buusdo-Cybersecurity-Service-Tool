import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { classifyUrl, TRACKER_HOSTS } from "../shared/detect.mjs";
import { TRACKER_HOSTS as extensionHosts, classifyUrl as extensionClassify } from "../extension/shared/detect.js";

test("extension detector matches the shared tracker list", () => {
  assert.deepEqual([...extensionHosts], [...TRACKER_HOSTS]);
  const sample = "https://paypal.secure-login.example/signin";
  assert.deepEqual(extensionClassify(sample), classifyUrl(sample));
});

test("declarativeNetRequest rules cover every tracker host", () => {
  const rules = JSON.parse(readFileSync(new URL("../extension/rules/tracker_blocklist.json", import.meta.url), "utf8"));
  const filters = new Set(rules.map((rule: { condition: { urlFilter: string } }) => rule.condition.urlFilter));
  for (const host of TRACKER_HOSTS) {
    assert.equal(filters.has(`||${host}^`), true, host);
  }
});

test("known tracker hosts are classified as trackers", () => {
  const result = classifyUrl("https://www.google-analytics.com/g/collect?tid=1");
  assert.equal(result.kind, "tracker");
  assert.equal(result.display.includes("tid"), false);
});

test("a real organisation domain is not treated as phishing", () => {
  assert.equal(classifyUrl("https://www.paypal.com/signin").kind, null);
  assert.equal(classifyUrl("https://www.cgd.pt/").kind, null);
  assert.equal(classifyUrl("https://example.com/").kind, null);
});

test("a lookalike host is phishing and a secret query is not stored", () => {
  const lookalike = classifyUrl("https://paypal.secure-login.example/signin");
  assert.equal(lookalike.kind, "phishing");
  assert.equal(lookalike.reason, "brand:paypal");

  const leaked = classifyUrl("https://example.com/reset?password=super-secret");
  assert.equal(leaked.kind, "phishing");
  assert.equal(leaked.reason, "query-secret");
  assert.equal(leaked.display.includes("super-secret"), false);
  assert.equal(leaked.display.includes("password"), false);
});