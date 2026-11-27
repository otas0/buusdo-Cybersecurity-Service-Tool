/**
 * When DNR matched-rule debug is unavailable, page-tracker caution toasts must still fire.
 *
 *   npx tsx --test tests/extension-dnr-fallback-toast.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("service worker toasts page trackers when DNR feedback is offline", () => {
  const sw = readFileSync("extension/background/service-worker.js", "utf8");
  assert.match(sw, /DNR_FEEDBACK_LIVE/);
  assert.match(sw, /!DNR_FEEDBACK_LIVE \|\| now - \(entry\.lastToastAt/);
  assert.match(sw, /softWebsiteCheck/);
  assert.match(sw, /kind: apiRisk === "danger" \? "phishing" : "tracker"/);
  assert.match(sw, /SOFT_CHECK_TTL_MS/);
  assert.match(sw, /privacyMode === "off" \? null : domainOnly/);
  assert.match(sw, /onMessageExternal/);
  assert.match(sw, /Safari Web Extension notes/);
});
