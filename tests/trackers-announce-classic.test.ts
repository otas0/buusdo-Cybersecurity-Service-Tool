import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { TRACKERS_ANNOUNCE_CLEAR_MS } from "../extension/shared/trackers-announce.mjs";

const require = createRequire(import.meta.url);

test("trackers-announce.classic.js exports ShieldTrackersAnnounce and SW importScripts uses it", () => {
  delete (globalThis as { ShieldTrackersAnnounce?: unknown }).ShieldTrackersAnnounce;
  require("../extension/shared/trackers-announce.classic.js");
  const api = (
    globalThis as {
      ShieldTrackersAnnounce?: {
        TRACKERS_ANNOUNCE_CLEAR_MS: number;
        createTrackersAnnounceClearScheduler: (opts?: object) => {
          schedule: (fn: () => void) => unknown;
          cancel: () => void;
          pending: boolean;
        };
        shouldAnnounceTrackersMute: (now: number, ready: number) => boolean;
      };
    }
  ).ShieldTrackersAnnounce;
  assert.ok(api);
  assert.equal(api!.TRACKERS_ANNOUNCE_CLEAR_MS, TRACKERS_ANNOUNCE_CLEAR_MS);
  assert.equal(api!.shouldAnnounceTrackersMute(10, 5), true);
  assert.equal(typeof api!.createTrackersAnnounceClearScheduler, "function");

  const sw = readFileSync(join(process.cwd(), "extension/background/service-worker.js"), "utf8");
  assert.match(sw, /trackers-announce\.classic\.js/);
  assert.match(sw, /ShieldTrackersAnnounce/);
  assert.match(sw, /createTrackersAnnounceClearScheduler/);
  assert.match(sw, /TRACKERS_ANNOUNCE_CLEAR_MS/);
  assert.match(sw, /shouldAnnounceTrackersMute/);
  assert.match(sw, /nextTrackersAnnounceReadyAt/);
});