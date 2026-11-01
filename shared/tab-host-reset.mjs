/**
 * Pure helpers for extension tab tracker reset on host change.
 * No chrome APIs — unit-tested from Node; classic SW wraps the same logic.
 *
 * sync-id: tab-host-reset-v2 — keep extension/shared/tab-host-reset.classic.js in lockstep
 * (tests/tab-host-reset.test.ts hashes registrableHint + nextTabsAfterHostChange bodies only).
 * Bump to v3 only when changing those two function bodies (classic + mjs together).
 * shouldHandleTabUpdated edits alone do not bump the sync-id.
 * Leave sync-id at v2 until an intentional dual-body change.
 */

/**
 * Gate for tabs.onUpdated — URL change or completed load (host stamp / reset).
 * @param {{ url?: string, status?: string }|null|undefined} changeInfo
 * @returns {boolean}
 */
export function shouldHandleTabUpdated(changeInfo) {
  if (!changeInfo || typeof changeInfo !== "object") return false;
  return Boolean(changeInfo.url) || changeInfo.status === "complete";
}

/**
 * @param {string} urlString
 * @returns {string} registrable-ish host hint (last two labels) or ""
 */
export function registrableHint(urlString) {
  try {
    const host = new URL(urlString).hostname.toLowerCase().replace(/\.$/, "");
    const parts = host.split(".");
    if (parts.length >= 2) return parts.slice(-2).join(".");
    return host;
  } catch {
    return "";
  }
}

/**
 * @param {Record<string, { trackers?: number, phishing?: number, lastToastAt?: number, host?: string }>} tabs
 * @param {number|string} tabId
 * @param {string} url
 * @returns {{ changed: boolean, tabs: typeof tabs }}
 */
export function nextTabsAfterHostChange(tabs, tabId, url) {
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