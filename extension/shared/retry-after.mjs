/**
 * Retry-After helpers aligned with security/retry-after.ts (extension popup 429 path).
 */

export function parseRetryAfterSec(raw, fallback = 60) {
  if (raw == null || raw === "") return fallback;
  const trimmed = String(raw).trim();
  const asNum = Number(trimmed);
  if (Number.isFinite(asNum) && asNum >= 0) {
    return Math.max(1, Math.ceil(asNum));
  }
  const asDate = Date.parse(trimmed);
  if (Number.isFinite(asDate)) {
    const sec = Math.ceil((asDate - Date.now()) / 1000);
    return sec > 0 ? sec : fallback;
  }
  return fallback;
}

export function retryAfterHeaderPreferred(headerSec, jsonSec) {
  const header = headerSec > 0 ? headerSec : -1;
  const json = typeof jsonSec === "number" && jsonSec > 0 ? jsonSec : -1;
  return header > 0 && json > 0 && Math.abs(header - json) > 2;
}

export function retryAfterPreferenceDeltaSec(headerSec, jsonSec) {
  const header = headerSec > 0 ? headerSec : -1;
  const json = typeof jsonSec === "number" && jsonSec > 0 ? jsonSec : -1;
  if (header <= 0 || json <= 0) return null;
  return Math.abs(header - json);
}

export function resolveRetryAfterSec(headerSec, jsonSec, fallback = 60) {
  const header = headerSec > 0 ? headerSec : -1;
  const json = typeof jsonSec === "number" && jsonSec > 0 ? jsonSec : -1;
  if (retryAfterHeaderPreferred(headerSec, jsonSec)) return header;
  if (json > 0) return json;
  if (header > 0) return header;
  return fallback;
}