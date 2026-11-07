/** One-time migrate of stored website API base from the old :3001 default. */

/** Local vinext default when PRODUCTION_ORIGIN is empty. */
export const LOCAL_DEV_ORIGIN = "http://localhost:3000";

/**
 * Cloudflare HTTPS origin (no trailing slash). Filled by:
 *   npm run production:origin -- https://…
 * Empty → DEFAULT_API_BASE is localhost.
 */
export const PRODUCTION_ORIGIN = "https://buusdocst.mtsu.workers.dev";

/** Prefer production origin after first deploy; otherwise local vinext. */
export const DEFAULT_API_BASE = (PRODUCTION_ORIGIN || LOCAL_DEV_ORIGIN).replace(/\/$/, "");

export const LEGACY_API_BASES = new Set([
  "http://127.0.0.1:3001",
  "http://localhost:3001",
  // Prior workers.dev names — migrate stored popup base to current DEFAULT_API_BASE
  "https://pcpd.mtsu.workers.dev",
  "https://preventive-shield.mtsu.workers.dev"
]);

/**
 * @param {string | null | undefined} raw
 * @returns {string} trimmed base without trailing slash; legacy → DEFAULT_API_BASE
 */
export function migrateLegacyApiBase(raw) {
  const trimmed = String(raw || "")
    .trim()
    .replace(/\/$/, "");
  if (!trimmed) return DEFAULT_API_BASE;
  if (LEGACY_API_BASES.has(trimmed)) return DEFAULT_API_BASE;
  return trimmed;
}