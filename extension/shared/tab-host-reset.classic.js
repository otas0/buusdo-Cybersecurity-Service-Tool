/**
 * Classic (non-module) copy of shared/tab-host-reset.mjs for MV3 importScripts.
 * sync-id: tab-host-reset-v2 — keep shared/tab-host-reset.mjs in lockstep
 * (tests/tab-host-reset.test.ts hashes registrableHint + nextTabsAfterHostChange bodies only).
 * Bump to v3 only when changing those two function bodies (classic + mjs together).
 * shouldHandleTabUpdated edits alone do not bump the sync-id.
 */
(function (global) {
  function shouldHandleTabUpdated(changeInfo) {
    if (!changeInfo || typeof changeInfo !== "object") return false;
    return Boolean(changeInfo.url) || changeInfo.status === "complete";
  }

  function registrableHint(urlString) {
    try {
      const host = new URL(urlString).hostname.toLowerCase().replace(/\.$/, "");
      const parts = host.split(".");
      if (parts.length >= 2) return parts.slice(-2).join(".");
      return host;
    } catch {
      return "";
    }
  }

  function nextTabsAfterHostChange(tabs, tabId, url) {
    const host = registrableHint(url);
    if (!host) return { changed: false, tabs };
    const key = String(tabId);
    const entry = tabs?.[key];
    if (!entry) return { changed: false, tabs };
    if (entry.host && entry.host !== host) {
      return {
        changed: true,
        tabs: {
          ...tabs,
          [key]: { trackers: 0, phishing: 0, lastToastAt: 0, host }
        }
      };
    }
    if (!entry.host) {
      return {
        changed: true,
        tabs: {
          ...tabs,
          [key]: { ...entry, host }
        }
      };
    }
    return { changed: false, tabs };
  }

  global.ShieldTabHost = { shouldHandleTabUpdated, registrableHint, nextTabsAfterHostChange };
})(typeof globalThis !== "undefined" ? globalThis : self);