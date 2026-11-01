/**
 * Popup Website-API mute announce: clear aria-live text after this many ms
 * so a later website-api scan can re-announce.
 */
export const TRACKERS_ANNOUNCE_CLEAR_MS = 1200;

/** True when a Website-API mute may announce (after clear delay). */
export function shouldAnnounceTrackersMute(nowMs, readyAtMs) {
  return nowMs >= readyAtMs;
}

/** Earliest ms when the next Website-API mute may re-announce. */
export function nextTrackersAnnounceReadyAt(nowMs, clearMs = TRACKERS_ANNOUNCE_CLEAR_MS) {
  return nowMs + clearMs;
}

/**
 * Schedules clearing aria-live announce text after clearMs.
 * A second schedule cancels the prior timer (repeat Website-API scans).
 * @param {{ clearMs?: number, setTimeoutFn?: typeof setTimeout, clearTimeoutFn?: typeof clearTimeout }} [opts]
 */
export function createTrackersAnnounceClearScheduler(opts = {}) {
  const clearMs = opts.clearMs ?? TRACKERS_ANNOUNCE_CLEAR_MS;
  const setTimeoutFn = opts.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = opts.clearTimeoutFn ?? clearTimeout;
  /** @type {ReturnType<typeof setTimeout>|null} */
  let timer = null;
  return {
    schedule(onClear) {
      if (timer != null) clearTimeoutFn(timer);
      timer = setTimeoutFn(() => {
        timer = null;
        onClear();
      }, clearMs);
      return timer;
    },
    cancel() {
      if (timer != null) clearTimeoutFn(timer);
      timer = null;
    },
    get pending() {
      return timer != null;
    }
  };
}