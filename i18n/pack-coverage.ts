import { messages } from "./messages";
import { LOCALE_PACKS } from "./pack-index";
import { normalizeLocale } from "./locales";

const EN_KEYS = Object.keys(messages.en);

/** Pack file has near-complete website chrome (snapshot-sized). */
export function isFullLocalePack(locale: string): boolean {
  const id = normalizeLocale(locale);
  if (id === "en" || id === "pt-PT") return true;
  const pack = LOCALE_PACKS[id];
  if (!pack) return false;
  return Object.keys(pack).filter((k) => pack[k]?.trim()).length >= 280;
}

/** Show Privacy/Settings banner when longer copy still falls back to English. */
export function showsPartialPackBanner(locale: string): boolean {
  return !isFullLocalePack(locale);
}

export function packCoverageRatio(locale: string): number {
  const id = normalizeLocale(locale);
  if (id === "en" || id === "pt-PT") return 1;
  const pack = LOCALE_PACKS[id] ?? {};
  const hit = EN_KEYS.filter((k) => pack[k]?.trim()).length;
  return EN_KEYS.length ? hit / EN_KEYS.length : 0;
}
