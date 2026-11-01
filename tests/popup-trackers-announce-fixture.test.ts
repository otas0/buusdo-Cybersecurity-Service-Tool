/**
 * Popup fixture: tiny DOM-like node + fake timers through clearTrackersApiAnnounceSoon
 * (createTrackersAnnounceClearScheduler) so aria-live can re-announce after CLEAR_MS.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  TRACKERS_ANNOUNCE_CLEAR_MS,
  createTrackersAnnounceClearScheduler,
  nextTrackersAnnounceReadyAt,
  shouldAnnounceTrackersMute
} from "../extension/shared/trackers-announce.mjs";

test("popup imports createTrackersAnnounceClearScheduler for clear path", () => {
  const popup = readFileSync(join(process.cwd(), "extension/popup/popup.js"), "utf8");
  assert.match(popup, /createTrackersAnnounceClearScheduler/);
  assert.match(popup, /clearTrackersApiAnnounceSoon/);
  assert.match(popup, /trackersApiAnnounce\.textContent\s*=\s*""/);
});

test("popup fixture: DOM announce text clears after TRACKERS_ANNOUNCE_CLEAR_MS via fake timers", () => {
  /** Tiny DOM fixture — mirrors popup els.trackersApiAnnounce. */
  const trackersApiAnnounce: { textContent: string } = { textContent: "" };
  const mutedCopy = "Trackers muted (Website API)";
  let readyAt = 0;
  let now = 1_000_000;
  let nextId = 1;
  const live = new Map<number, () => void>();

  const clear = createTrackersAnnounceClearScheduler({
    clearMs: TRACKERS_ANNOUNCE_CLEAR_MS,
    setTimeoutFn: ((fn: () => void) => {
      const id = nextId++;
      live.set(id, fn);
      return id as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout,
    clearTimeoutFn: ((id: ReturnType<typeof setTimeout>) => {
      live.delete(id as unknown as number);
    }) as typeof clearTimeout
  });

  function clearTrackersApiAnnounceSoon() {
    clear.schedule(() => {
      trackersApiAnnounce.textContent = "";
      readyAt = now + TRACKERS_ANNOUNCE_CLEAR_MS;
    });
  }

  function announceFromApi() {
    if (!shouldAnnounceTrackersMute(now, readyAt)) return false;
    trackersApiAnnounce.textContent = mutedCopy;
    readyAt = nextTrackersAnnounceReadyAt(now, TRACKERS_ANNOUNCE_CLEAR_MS);
    clearTrackersApiAnnounceSoon();
    return true;
  }

  function tickClearMs() {
    for (const [id, fn] of [...live.entries()]) {
      live.delete(id);
      fn();
    }
    now += TRACKERS_ANNOUNCE_CLEAR_MS;
  }

  assert.equal(announceFromApi(), true);
  assert.equal(trackersApiAnnounce.textContent, mutedCopy);
  assert.equal(announceFromApi(), false, "second announce within clear window must skip");
  assert.equal(trackersApiAnnounce.textContent, mutedCopy);
  assert.equal(clear.pending, true);

  tickClearMs();

  const cleared = trackersApiAnnounce.textContent;
  if (cleared !== "") {
    console.warn(
      "[popup-fixture] announce text not cleared after TRACKERS_ANNOUNCE_CLEAR_MS (soft):",
      cleared
    );
  } else {
    console.info("[popup-fixture] DOM announce cleared after TRACKERS_ANNOUNCE_CLEAR_MS");
  }
  assert.equal(cleared, "");
  assert.equal(shouldAnnounceTrackersMute(now, readyAt), true);
  assert.equal(announceFromApi(), true);
  assert.equal(trackersApiAnnounce.textContent, mutedCopy);
});