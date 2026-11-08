import { normalizeLocale, isLocale } from "../i18n/locales";

/**
 * Pick a shipped locale from an Accept-Language header value.
 * Returns null when English is preferred or nothing matches.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): string | null {
  if (!header?.trim()) return null;
  const parts = header.split(",").map((p) => {
    const [tag, ...params] = p.trim().split(";");
    let q = 1;
    for (const param of params) {
      const m = /q\s*=\s*([0-9.]+)/i.exec(param);
      if (m) q = Number(m[1]) || 0;
    }
    return { tag: tag.trim(), q };
  });
  parts.sort((a, b) => b.q - a.q);
  for (const { tag } of parts) {
    const id = normalizeLocale(tag);
    if (id === "en") continue;
    if (isLocale(id)) return id;
  }
  return null;
}
