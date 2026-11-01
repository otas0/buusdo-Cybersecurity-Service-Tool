import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("service worker wires Website-API mute announce via createTrackersAnnounceClearScheduler", () => {
  const sw = readFileSync(join(process.cwd(), "extension/background/service-worker.js"), "utf8");
  assert.match(sw, /trackers-announce\.classic\.js/);
  assert.match(sw, /createTrackersAnnounceClearScheduler/);
  assert.match(sw, /function noteWebsiteApiTrackersMute/);
  assert.match(sw, /SHIELD_RECORD_API_SCAN/);
  assert.match(sw, /trackersMutedAnnounced\s*=\s*noteWebsiteApiTrackersMute\(\)/);
  assert.match(sw, /trackersMutedAnnounced/);
  assert.match(sw, /trackersApiAnnounceActive/);
  assert.match(sw, /shouldAnnounceTrackersMute/);
  assert.match(sw, /nextTrackersAnnounceReadyAt/);
  assert.match(sw, /trackersAnnounceClear\.schedule/);
});

test("support blob extras include trackersApiAnnounceActive after RECORD_API_SCAN wiring", () => {
  const sw = readFileSync(join(process.cwd(), "extension/background/service-worker.js"), "utf8");
  assert.match(sw, /SHIELD_SUPPORT_BLOB/);
  assert.match(
    sw,
    /buildSupportResponse\([\s\S]*trackersApiAnnounceActive/
  );
  // lastScan from RECORD_API_SCAN carries the same flag the support blob extras read.
  assert.match(
    sw,
    /trackersMutedAnnounced\s*=\s*noteWebsiteApiTrackersMute\(\)[\s\S]*trackersApiAnnounceActive/
  );
  // Mute-window debug: both flags in support blob extras.
  assert.match(
    sw,
    /trackersApiAnnounceActive[\s\S]*trackersMutedAnnounced:\s*st\.lastScan\?\.trackersMutedAnnounced\s*===\s*true/
  );
  const blob = readFileSync(join(process.cwd(), "extension/shared/support-blob.classic.js"), "utf8");
  assert.match(blob, /trackersApiAnnounceActive:\s*extras\?\.trackersApiAnnounceActive\s*===\s*true/);
  assert.match(blob, /trackersMutedAnnounced:\s*extras\?\.trackersMutedAnnounced\s*===\s*true/);
});