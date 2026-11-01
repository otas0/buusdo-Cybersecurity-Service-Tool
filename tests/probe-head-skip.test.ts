import test from "node:test";
import assert from "node:assert/strict";
import {
  clearHeadSkipCache,
  listHeadSkipDomains,
  listHeadSkipEntries,
  rememberHeadFail,
  serializeHeadSkipEntry,
  shouldSkipHead
} from "../security/probe-head-skip";

test("shouldSkipHead uses client hints immediately", () => {
  clearHeadSkipCache();
  assert.equal(shouldSkipHead("hostile.example", ["hostile.example"]), true);
  assert.equal(shouldSkipHead("ok.example", ["hostile.example"]), false);
});

test("server cache skips after repeated head fails", () => {
  clearHeadSkipCache();
  rememberHeadFail("flaky.example");
  assert.equal(shouldSkipHead("flaky.example"), false);
  rememberHeadFail("flaky.example");
  assert.equal(shouldSkipHead("flaky.example"), true);
  assert.ok(listHeadSkipDomains().includes("flaky.example"));
  clearHeadSkipCache();
});

test("serializeHeadSkipEntry maps epoch until to ISO for /api/health", () => {
  clearHeadSkipCache();
  rememberHeadFail("iso.example");
  rememberHeadFail("iso.example");
  const row = listHeadSkipEntries().find((entry) => entry.domain === "iso.example");
  assert.ok(row);
  assert.equal(typeof row.until, "number");
  assert.ok(row.until > Date.now());
  const wire = serializeHeadSkipEntry(row);
  assert.equal(wire.domain, "iso.example");
  assert.equal(wire.fails, row.fails);
  assert.match(wire.until, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.equal(new Date(wire.until).getTime(), row.until);
  clearHeadSkipCache();
});