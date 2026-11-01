import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  TRACKERS_ANNOUNCE_CLEAR_MS,
  nextTrackersAnnounceReadyAt,
  shouldAnnounceTrackersMute
} from "../extension/shared/trackers-announce.mjs";

test("TRACKERS_ANNOUNCE_CLEAR_MS is a positive finite delay", () => {
  assert.equal(typeof TRACKERS_ANNOUNCE_CLEAR_MS, "number");
  assert.ok(Number.isFinite(TRACKERS_ANNOUNCE_CLEAR_MS));
  assert.ok(TRACKERS_ANNOUNCE_CLEAR_MS >= 500);
  assert.ok(TRACKERS_ANNOUNCE_CLEAR_MS <= 5000);
});

test("popup imports TRACKERS_ANNOUNCE_CLEAR_MS from shared module", () => {
  const popup = readFileSync(join(process.cwd(), "extension/popup/popup.js"), "utf8");
  assert.match(popup, /from\s+["']\.\.\/shared\/trackers-announce\.mjs["']/);
  assert.match(popup, /TRACKERS_ANNOUNCE_CLEAR_MS/);
  assert.match(popup, /shouldAnnounceTrackersMute/);
  assert.match(popup, /nextTrackersAnnounceReadyAt/);
  assert.match(popup, /createTrackersAnnounceClearScheduler/);
  assert.doesNotMatch(popup, /const TRACKERS_ANNOUNCE_CLEAR_MS\s*=/);
});

test("popup re-announces Website API mute only after TRACKERS_ANNOUNCE_CLEAR_MS", () => {
  const popup = readFileSync(join(process.cwd(), "extension/popup/popup.js"), "utf8");
  assert.match(popup, /trackersAnnounceReadyAt/);
  assert.match(popup, /shouldAnnounceTrackersMute\(now,\s*trackersAnnounceReadyAt\)/);
  assert.match(popup, /trackersAnnounceClear\.schedule/);
  assert.match(popup, /trackersMutedAnnounced/);
});

test("shouldAnnounceTrackersMute gate with fake timers", () => {
  let now = 1_000_000;
  let readyAt = 0;
  assert.equal(shouldAnnounceTrackersMute(now, readyAt), true);
  readyAt = nextTrackersAnnounceReadyAt(now, TRACKERS_ANNOUNCE_CLEAR_MS);
  assert.equal(shouldAnnounceTrackersMute(now, readyAt), false);
  assert.equal(shouldAnnounceTrackersMute(now + TRACKERS_ANNOUNCE_CLEAR_MS - 1, readyAt), false);
  now += TRACKERS_ANNOUNCE_CLEAR_MS;
  assert.equal(shouldAnnounceTrackersMute(now, readyAt), true);
});