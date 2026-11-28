/**
 * China Pages helpers + (legacy) Workers redirect hooks.
 *
 * Product decision (2026-11-28): **do not** force-redirect by CF country on Workers.
 * Mainland users often cannot TCP to *.workers.dev — a CN 302 never helps them and
 * mis-classifies reachable users (VPN / language / SoftTip). Notice is Pages-only
 * via store / QR / promo — see docs/CHINA_GITHUB_PAGES.md.
 */
import chinaPages from "./china-pages.json";

export const CHINA_PAGES_ORIGIN = String(
  chinaPages.url || "https://otas0.github.io/buusdocst/"
).replace(/\/$/, "");

export const CHINA_WORKERS_STAY_COOKIE = "buusdocst-china-workers-stay";
export const CHINA_WORKERS_STAY_PARAM = "china_workers_stay";

/** Empty = no Worker/middleware force-bounce by country (intentional). */
export const CHINA_FORCE_REDIRECT_COUNTRIES = new Set<string>([]);

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
