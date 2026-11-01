/**
 * Privacy-gated sessionStorage helpers for the Scan resources textarea.
 * Persist only when privacyMode is local or share — never when off.
 */

export const SCAN_RESOURCES_KEY = "shieldDesktopScanResources";

/**
 * Non-empty line count for smoke/assert messages (fixture string lengths).
 * @param {string} text
 * @returns {number}
 */
export function countFixtureLines(text) {
  return String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean).length;
}

/**
 * Character length of a fixture blob (for failure messages: len=${…}).
 * @param {string} text
 * @returns {number}
 */
export function fixtureStringLength(text) {
  return String(text || "").length;
}

/**
 * @param {string} privacyMode
 * @returns {boolean}
 */
export function shouldPersistScanResources(privacyMode) {
  return privacyMode === "local" || privacyMode === "share";
}

/**
 * @param {{ getItem: (k: string) => string|null }} [storage]
 * @returns {string}
 */
export function readPersistedScanResources(storage = globalThis.sessionStorage) {
  try {
    const raw = storage.getItem(SCAN_RESOURCES_KEY);
    return typeof raw === "string" ? raw : "";
  } catch {
    return "";
  }
}

/**
 * @param {string} value
 * @param {string} privacyMode
 * @param {{ setItem: (k: string, v: string) => void, removeItem: (k: string) => void }} [storage]
 * @returns {boolean} true when written
 */
export function writePersistedScanResources(value, privacyMode, storage = globalThis.sessionStorage) {
  if (!shouldPersistScanResources(privacyMode)) {
    try {
      storage.removeItem(SCAN_RESOURCES_KEY);
    } catch {
      /* ignore */
    }
    return false;
  }
  try {
    storage.setItem(SCAN_RESOURCES_KEY, value || "");
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {{ removeItem: (k: string) => void }} [storage]
 */
export function clearPersistedScanResourcesStorage(storage = globalThis.sessionStorage) {
  try {
    storage.removeItem(SCAN_RESOURCES_KEY);
  } catch {
    /* ignore */
  }
}