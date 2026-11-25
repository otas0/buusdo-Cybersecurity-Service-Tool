/**
 * Workers → China Pages force redirect when Cloudflare marks the visitor as CN.
 * Used by middleware.ts (edge) and unit tests.
 */
import chinaPages from "./china-pages.json";

export const CHINA_PAGES_ORIGIN = String(
  chinaPages.url || "https://otas0.github.io/buusdocst/"
).replace(/\/$/, "");

export const CHINA_WORKERS_STAY_COOKIE = "buusdocst-china-workers-stay";
export const CHINA_WORKERS_STAY_PARAM = "china_workers_stay";

/** Cloudflare request country codes that force-bounce to the China notice. */
export const CHINA_FORCE_REDIRECT_COUNTRIES = new Set(["CN"]);

export function isChinaForceCountry(country: string | null | undefined): boolean {
  const c = String(country || "")
    .trim()
    .toUpperCase();
  return CHINA_FORCE_REDIRECT_COUNTRIES.has(c);
}

/**
 * Prefer Workers `request.cf.country` (always set on CF) over CF-IPCountry header
 * (header often missing on workers.dev unless Managed Transforms add it).
 */
export function countryFromWorkersRequest(request: {
  cf?: { country?: string | null } | null;
  headers?: { get(name: string): string | null };
  geo?: { country?: string | null } | null;
}): string {
  const fromCf =
    request.cf && typeof request.cf.country === "string" ? request.cf.country : "";
  const fromGeo =
    request.geo && typeof request.geo.country === "string" ? request.geo.country : "";
  const h = request.headers;
  const fromHeader = h
    ? h.get("cf-ipcountry") ||
      h.get("CF-IPCountry") ||
      h.get("x-vercel-ip-country") ||
      ""
    : "";
  return String(fromCf || fromGeo || fromHeader || "")
    .trim()
    .toUpperCase();
}

/**
 * Map a Workers pathname to the matching China Pages notice file.
 * Pages only ships zh (index.html) + en (en.html).
 */
export function chinaPagesDestForWorkersPath(pathname: string): string {
  const p = String(pathname || "/").split("?")[0] || "/";
  if (p === "/en" || p.startsWith("/en/")) {
    return `${CHINA_PAGES_ORIGIN}/en.html`;
  }
  return `${CHINA_PAGES_ORIGIN}/`;
}

/** Paths that must never bounce (API, health, static). */
export function shouldSkipChinaWorkersRedirect(pathname: string): boolean {
  const p = String(pathname || "/");
  if (p.startsWith("/api/")) return true;
  if (p.startsWith("/_next/")) return true;
  if (p.startsWith("/brand/")) return true;
  if (p.startsWith("/promo/")) return true;
  if (p.startsWith("/assets/")) return true;
  if (/\.[a-zA-Z0-9]{1,8}$/.test(p)) return true; // favicon.ico, robots.txt, …
  return false;
}
