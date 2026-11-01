/**
 * Shared production website origin (Cloudflare Workers).
 * After first successful deploy:
 *   npm run production:origin -- https://YOUR.workers.dev
 * or custom domain. Keeps extension + desktop defaults in sync.
 */

export const LOCAL_DEV_ORIGIN = "http://localhost:3000";

/**
 * Canonical HTTPS origin with no trailing slash.
 * Updated by scripts/set-production-origin.mjs — do not hand-edit in PRs without running the script.
 */
export const PRODUCTION_ORIGIN = "https://preventive-shield.mtsu.workers.dev";

export function normalizeOrigin(raw) {
  return String(raw || "")
    .trim()
    .replace(/\/$/, "");
}

export function getProductionOrigin() {
  return normalizeOrigin(PRODUCTION_ORIGIN) || null;
}

/** Prefer configured production origin; otherwise local vinext. */
export function getDefaultWebsiteOrigin() {
  return getProductionOrigin() || LOCAL_DEV_ORIGIN;
}

export function isProductionOriginConfigured() {
  return Boolean(getProductionOrigin());
}

/** Apex host only (no www.) for canonical checks. */
export function getCanonicalHost() {
  const origin = getProductionOrigin();
  if (!origin) return null;
  try {
    return new URL(origin).host.replace(/^www\./i, "");
  } catch {
    return null;
  }
}