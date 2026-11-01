/**
 * Parse Retry-After header: delta-seconds or HTTP-date (RFC 9110).
 */
export function parseRetryAfterSec(raw: string | null | undefined, fallback = 60): number {
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

/** True when both values are present and differ by more than 2 seconds (header should win). */
export function retryAfterHeaderPreferred(
  headerSec: number,
  jsonSec: number | undefined | null
): boolean {
  const header = headerSec > 0 ? headerSec : -1;
  const json = typeof jsonSec === "number" && jsonSec > 0 ? jsonSec : -1;
  return header > 0 && json > 0 && Math.abs(header - json) > 2;
}

/** Absolute |header − JSON| seconds when both are positive; otherwise null. */
export function retryAfterPreferenceDeltaSec(
  headerSec: number,
  jsonSec: number | undefined | null
): number | null {
  const header = headerSec > 0 ? headerSec : -1;
  const json = typeof jsonSec === "number" && jsonSec > 0 ? jsonSec : -1;
  if (header <= 0 || json <= 0) return null;
  return Math.abs(header - json);
}

/**
 * Combine header + JSON retryAfterSec.
 * When both are present and disagree by more than 2s, the Retry-After header wins.
 */
export function resolveRetryAfterSec(
  headerSec: number,
  jsonSec: number | undefined | null,
  fallback = 60
): number {
  const header = headerSec > 0 ? headerSec : -1;
  const json = typeof jsonSec === "number" && jsonSec > 0 ? jsonSec : -1;
  if (retryAfterHeaderPreferred(headerSec, jsonSec)) return header;
  if (json > 0) return json;
  if (header > 0) return header;
  return fallback;
}