/**
 * Diagnostics-only support blob (no paste payload — lastPasteAt ISO only).
 */
(function (global) {
  function normalizePrivacyMode(value) {
    if (value === "local" || value === "share") return value;
    return "off";
  }

  /**
   * @param {unknown} privacyMode
   * @param {unknown} lastPasteAt
   * @param {string} [nowIso]
   * @param {{ trackersApiAnnounceActive?: boolean, trackersMutedAnnounced?: boolean, accountSignedIn?: boolean }} [extras]
   */
  function buildSupportResponse(privacyMode, lastPasteAt, nowIso, extras) {
    if (normalizePrivacyMode(privacyMode) !== "share") {
      return { ok: false, error: "need-diagnostics" };
    }
    return {
      ok: true,
      blob: {
        at: typeof nowIso === "string" && nowIso ? nowIso : new Date().toISOString(),
        lastPasteAt: typeof lastPasteAt === "string" && lastPasteAt ? lastPasteAt : null,
        source: "extension-support",
        /** Mute-window debug: true while Website-API trackers announce clear timer is active. */
        trackersApiAnnounceActive: extras?.trackersApiAnnounceActive === true,
        /** Last RECORD_API_SCAN gate result (whether this scan was allowed to announce). */
        trackersMutedAnnounced: extras?.trackersMutedAnnounced === true,
        /** Signed-in flag only — never email. */
        accountSignedIn: extras?.accountSignedIn === true
      }
    };
  }

  global.ShieldSupport = {
    normalizePrivacyMode: normalizePrivacyMode,
    buildSupportResponse: buildSupportResponse
  };
})(typeof globalThis !== "undefined" ? globalThis : self);