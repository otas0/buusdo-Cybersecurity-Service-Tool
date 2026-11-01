/** Storage key for Halt-styled API base fallback notice (popup + tests). */
export const API_BASE_FALLBACK_NOTICE_KEY = "websiteApiBaseFallbackNotice";

/**
 * Whether the popup should show the localhost fallback notice from storage
 * (no DOM — unit-testable).
 * @param {Record<string, unknown> | null | undefined} stored
 */
export function shouldShowFallbackFromStorage(stored) {
  if (!stored || typeof stored !== "object") return false;
  return Boolean(stored[API_BASE_FALLBACK_NOTICE_KEY]);
}