/**
 * Classic (non-module) copy of trackers-announce.mjs for MV3 importScripts
 * if the service worker ever announces Trackers mute (Website API).
 * Keep in lockstep with extension/shared/trackers-announce.mjs.
 */
(function (global) {
  var TRACKERS_ANNOUNCE_CLEAR_MS = 1200;

  function shouldAnnounceTrackersMute(nowMs, readyAtMs) {
    return nowMs >= readyAtMs;
  }

  function nextTrackersAnnounceReadyAt(nowMs, clearMs) {
    return nowMs + (clearMs == null ? TRACKERS_ANNOUNCE_CLEAR_MS : clearMs);
  }

  function createTrackersAnnounceClearScheduler(opts) {
    opts = opts || {};
    var clearMs = opts.clearMs != null ? opts.clearMs : TRACKERS_ANNOUNCE_CLEAR_MS;
    var setTimeoutFn = opts.setTimeoutFn || setTimeout;
    var clearTimeoutFn = opts.clearTimeoutFn || clearTimeout;
    var timer = null;
    return {
      schedule: function (onClear) {
        if (timer != null) clearTimeoutFn(timer);
        timer = setTimeoutFn(function () {
          timer = null;
          onClear();
        }, clearMs);
        return timer;
      },
      cancel: function () {
        if (timer != null) clearTimeoutFn(timer);
        timer = null;
      },
      get pending() {
        return timer != null;
      }
    };
  }

  global.ShieldTrackersAnnounce = {
    TRACKERS_ANNOUNCE_CLEAR_MS: TRACKERS_ANNOUNCE_CLEAR_MS,
    shouldAnnounceTrackersMute: shouldAnnounceTrackersMute,
    nextTrackersAnnounceReadyAt: nextTrackersAnnounceReadyAt,
    createTrackersAnnounceClearScheduler: createTrackersAnnounceClearScheduler
  };
})(typeof globalThis !== "undefined" ? globalThis : self);