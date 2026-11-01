import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("service worker importScripts includes support-blob.classic.js", () => {
  const sw = readFileSync(join(process.cwd(), "extension/background/service-worker.js"), "utf8");
  assert.match(sw, /support-blob\.classic\.js/);
  assert.match(sw, /importScripts\s*\(/);
});