import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { countThirdPartyTrackers } from "../shared/detect.mjs";

test("service worker resets tab trackers on host change and uses countThirdPartyTrackers", () => {
  const sw = readFileSync(join(process.cwd(), "extension/background/service-worker.js"), "utf8");
  assert.match(sw, /function resetTabIfHostChanged/);
  assert.match(sw, /nextTabsAfterHostChange/);
  assert.match(sw, /tab-host-reset\.classic\.js/);
  assert.match(sw, /countThirdPartyTrackers/);
});

test("YouTube + DoubleClick resources alone never bump third-party tracker count", () => {
  const n = countThirdPartyTrackers("https://www.youtube.com/", [
    "https://static.doubleclick.net/instream/ad_status.js",
    "https://googleads.g.doubleclick.net/pagead/id"
  ]);
  assert.equal(n, 0);
});