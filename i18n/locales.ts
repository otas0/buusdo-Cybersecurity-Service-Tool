/**
 * Supported UI locales for buusdo Cybersecurity Service Tool (website first).
 * Packs live under i18n/packs/; missing keys fall back to English.
 */

export type LocaleRegion =
  | "global"
  | "east-asia"
  | "europe"
  | "southern-africa"
  | "pacific"
  | "southeast-asia";

export type LocaleEntry = {
  id: string;
  nativeName: string;
  englishName: string;
  region: LocaleRegion;
  /** BCP-47 / HTML lang */
  htmlLang: string;
  /** Intl / toLocaleString */
  intl: string;
};

export const LOCALE_REGION_LABELS: Record<LocaleRegion, { en: string; zh: string }> = {
  global: { en: "Global", zh: "全球" },
  "east-asia": { en: "East Asia", zh: "东亚" },
  europe: { en: "Europe", zh: "欧洲" },
  "southern-africa": { en: "Southern Africa", zh: "南部非洲" },
  pacific: { en: "Pacific", zh: "太平洋" },
  "southeast-asia": { en: "Southeast Asia", zh: "东南亚" }
};

/** Order of optgroups in the language picker. */
export const LOCALE_REGION_ORDER: LocaleRegion[] = [
  "global",
  "east-asia",
  "europe",
  "southern-africa",
  "pacific",
  "southeast-asia"
];

/**
 * Short “Frequent” strip shared by LanguageSwitcher + LocaleRecommendModal.
 * Keep in sync — do not diverge per component.
 */
export const FREQUENT_LOCALE_IDS = [
  "en",
  "zh-Hans",
  "zh-Hant",
  "ja",
  "pt-PT",
  "de",
  "fr",
  "es"
] as const;

/**
 * Ship list: EN + 简/繁/日/葡 + Europe + South Africa (11 official) + te reo Māori + ASEAN national languages.
 * SEA/Pacific packs must be real translations (no EN stubs).
 * Aliases: zh → zh-Hans, zh-CN/zh-SG → zh-Hans, zh-TW/zh-HK → zh-Hant, pt → pt-PT, jp → ja, tl → fil, no → nb.
 */
export const LOCALE_CATALOG: readonly LocaleEntry[] = [
  { id: "en", nativeName: "English", englishName: "English", region: "global", htmlLang: "en", intl: "en-GB" },

  { id: "zh-Hans", nativeName: "简体中文", englishName: "Chinese (Simplified)", region: "east-asia", htmlLang: "zh-Hans", intl: "zh-CN" },
  { id: "zh-Hant", nativeName: "繁體中文", englishName: "Chinese (Traditional)", region: "east-asia", htmlLang: "zh-Hant", intl: "zh-TW" },
  { id: "ja", nativeName: "日本語", englishName: "Japanese", region: "east-asia", htmlLang: "ja", intl: "ja-JP" },

  { id: "pt-PT", nativeName: "Português (Portugal)", englishName: "Portuguese (Portugal)", region: "europe", htmlLang: "pt-PT", intl: "pt-PT" },
  { id: "pt-BR", nativeName: "Português (Brasil)", englishName: "Portuguese (Brazil)", region: "europe", htmlLang: "pt-BR", intl: "pt-BR" },
  { id: "de", nativeName: "Deutsch", englishName: "German", region: "europe", htmlLang: "de", intl: "de-DE" },
  { id: "fr", nativeName: "Français", englishName: "French", region: "europe", htmlLang: "fr", intl: "fr-FR" },
  { id: "es", nativeName: "Español", englishName: "Spanish", region: "europe", htmlLang: "es", intl: "es-ES" },
  { id: "it", nativeName: "Italiano", englishName: "Italian", region: "europe", htmlLang: "it", intl: "it-IT" },
  { id: "nl", nativeName: "Nederlands", englishName: "Dutch", region: "europe", htmlLang: "nl", intl: "nl-NL" },
  { id: "pl", nativeName: "Polski", englishName: "Polish", region: "europe", htmlLang: "pl", intl: "pl-PL" },
  { id: "sv", nativeName: "Svenska", englishName: "Swedish", region: "europe", htmlLang: "sv", intl: "sv-SE" },
  { id: "da", nativeName: "Dansk", englishName: "Danish", region: "europe", htmlLang: "da", intl: "da-DK" },
  { id: "fi", nativeName: "Suomi", englishName: "Finnish", region: "europe", htmlLang: "fi", intl: "fi-FI" },
  { id: "nb", nativeName: "Norsk bokmål", englishName: "Norwegian Bokmål", region: "europe", htmlLang: "nb", intl: "nb-NO" },
  { id: "el", nativeName: "Ελληνικά", englishName: "Greek", region: "europe", htmlLang: "el", intl: "el-GR" },
  { id: "cs", nativeName: "Čeština", englishName: "Czech", region: "europe", htmlLang: "cs", intl: "cs-CZ" },
  { id: "sk", nativeName: "Slovenčina", englishName: "Slovak", region: "europe", htmlLang: "sk", intl: "sk-SK" },
  { id: "hu", nativeName: "Magyar", englishName: "Hungarian", region: "europe", htmlLang: "hu", intl: "hu-HU" },
  { id: "ro", nativeName: "Română", englishName: "Romanian", region: "europe", htmlLang: "ro", intl: "ro-RO" },
  { id: "bg", nativeName: "Български", englishName: "Bulgarian", region: "europe", htmlLang: "bg", intl: "bg-BG" },
  { id: "hr", nativeName: "Hrvatski", englishName: "Croatian", region: "europe", htmlLang: "hr", intl: "hr-HR" },
  { id: "sl", nativeName: "Slovenščina", englishName: "Slovenian", region: "europe", htmlLang: "sl", intl: "sl-SI" },
  { id: "lt", nativeName: "Lietuvių", englishName: "Lithuanian", region: "europe", htmlLang: "lt", intl: "lt-LT" },
  { id: "lv", nativeName: "Latviešu", englishName: "Latvian", region: "europe", htmlLang: "lv", intl: "lv-LV" },
  { id: "et", nativeName: "Eesti", englishName: "Estonian", region: "europe", htmlLang: "et", intl: "et-EE" },
  { id: "ga", nativeName: "Gaeilge", englishName: "Irish", region: "europe", htmlLang: "ga", intl: "ga-IE" },
  { id: "mt", nativeName: "Malti", englishName: "Maltese", region: "europe", htmlLang: "mt", intl: "mt-MT" },
  { id: "uk", nativeName: "Українська", englishName: "Ukrainian", region: "europe", htmlLang: "uk", intl: "uk-UA" },
  { id: "is", nativeName: "Íslenska", englishName: "Icelandic", region: "europe", htmlLang: "is", intl: "is-IS" },
  { id: "ca", nativeName: "Català", englishName: "Catalan", region: "europe", htmlLang: "ca", intl: "ca-ES" },

  // South Africa — 11 official languages (EN already under global)
  { id: "af", nativeName: "Afrikaans", englishName: "Afrikaans", region: "southern-africa", htmlLang: "af", intl: "af-ZA" },
  { id: "zu", nativeName: "isiZulu", englishName: "Zulu", region: "southern-africa", htmlLang: "zu", intl: "zu-ZA" },
  { id: "xh", nativeName: "isiXhosa", englishName: "Xhosa", region: "southern-africa", htmlLang: "xh", intl: "xh-ZA" },
  { id: "nso", nativeName: "Sesotho sa Leboa", englishName: "Northern Sotho", region: "southern-africa", htmlLang: "nso", intl: "nso-ZA" },
  { id: "st", nativeName: "Sesotho", englishName: "Southern Sotho", region: "southern-africa", htmlLang: "st", intl: "st-ZA" },
  { id: "tn", nativeName: "Setswana", englishName: "Tswana", region: "southern-africa", htmlLang: "tn", intl: "tn-ZA" },
  { id: "ss", nativeName: "siSwati", englishName: "Swati", region: "southern-africa", htmlLang: "ss", intl: "ss-ZA" },
  { id: "ve", nativeName: "Tshivenḓa", englishName: "Venda", region: "southern-africa", htmlLang: "ve", intl: "ve-ZA" },
  { id: "ts", nativeName: "Xitsonga", englishName: "Tsonga", region: "southern-africa", htmlLang: "ts", intl: "ts-ZA" },
  { id: "nr", nativeName: "isiNdebele", englishName: "Southern Ndebele", region: "southern-africa", htmlLang: "nr", intl: "nr-ZA" },

  { id: "mi", nativeName: "Te reo Māori", englishName: "Māori", region: "pacific", htmlLang: "mi", intl: "mi-NZ" },

  { id: "id", nativeName: "Bahasa Indonesia", englishName: "Indonesian", region: "southeast-asia", htmlLang: "id", intl: "id-ID" },
  { id: "ms", nativeName: "Bahasa Melayu", englishName: "Malay", region: "southeast-asia", htmlLang: "ms", intl: "ms-MY" },
  { id: "th", nativeName: "ไทย", englishName: "Thai", region: "southeast-asia", htmlLang: "th", intl: "th-TH" },
  { id: "vi", nativeName: "Tiếng Việt", englishName: "Vietnamese", region: "southeast-asia", htmlLang: "vi", intl: "vi-VN" },
  { id: "fil", nativeName: "Filipino", englishName: "Filipino", region: "southeast-asia", htmlLang: "fil", intl: "fil-PH" },
  { id: "km", nativeName: "ភាសាខ្មែរ", englishName: "Khmer", region: "southeast-asia", htmlLang: "km", intl: "km-KH" },
  { id: "lo", nativeName: "ລາວ", englishName: "Lao", region: "southeast-asia", htmlLang: "lo", intl: "lo-LA" },
  { id: "my", nativeName: "မြန်မာ", englishName: "Burmese", region: "southeast-asia", htmlLang: "my", intl: "my-MM" }
] as const satisfies readonly LocaleEntry[];

/** Literal union of shipped locale ids. */
export type LocaleId = (typeof LOCALE_CATALOG)[number]["id"];

export const LOCALE_IDS = LOCALE_CATALOG.map((e) => e.id) as LocaleId[];

const byId = new Map(LOCALE_CATALOG.map((e) => [e.id, e]));

const ALIASES: Record<string, string> = {
  zh: "zh-Hans",
  "zh-CN": "zh-Hans",
  "zh-SG": "zh-Hans",
  "zh-TW": "zh-Hant",
  "zh-HK": "zh-Hant",
  "zh-MO": "zh-Hant",
  jp: "ja",
  "ja-JP": "ja",
  pt: "pt-PT",
  "pt-pt": "pt-PT",
  "pt-br": "pt-BR",
  no: "nb",
  "nb-NO": "nb",
  tl: "fil",
  "fil-PH": "fil",
  "tl-PH": "fil",
  // SEA region tags / legacy codes
  "th-TH": "th",
  "vi-VN": "vi",
  "id-ID": "id",
  ind: "id",
  "ms-MY": "ms",
  "ms-BN": "ms",
  may: "ms",
  "km-KH": "km",
  kh: "km",
  "lo-LA": "lo",
  lao: "lo",
  "my-MM": "my",
  bur: "my",
  // Southern Africa region tags
  "af-ZA": "af",
  "zu-ZA": "zu",
  "xh-ZA": "xh",
  "nso-ZA": "nso",
  "st-ZA": "st",
  "tn-ZA": "tn",
  "ss-ZA": "ss",
  "ss-SZ": "ss",
  "ve-ZA": "ve",
  "ts-ZA": "ts",
  "nr-ZA": "nr",
  "nr-ZW": "nr",
  "mi-NZ": "mi",
  iw: "he", // not shipped; normalize only
  "en-US": "en",
  "en-GB": "en",
  "en-ZA": "en",
  "en-NZ": "en",
  "en-SG": "en",
  "en-MY": "en",
  "en-PH": "en"
};

export function isLocale(id: string): boolean {
  return byId.has(id);
}

/**
 * If `raw` is a known alias (e.g. zh → zh-Hans), return the shipped locale id.
 * Returns null when `raw` is already a shipped id or is unknown junk.
 */
export function localeAliasTarget(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || byId.has(trimmed)) return null;
  if (ALIASES[trimmed] && byId.has(ALIASES[trimmed])) return ALIASES[trimmed];
  const lower = trimmed.toLowerCase();
  for (const [alias, id] of Object.entries(ALIASES)) {
    if (alias.toLowerCase() === lower && byId.has(id)) return id;
  }
  // zh-Hans-CN / zh-TW-x → normalize
  if (lower === "zh" || lower.startsWith("zh-")) {
    const n = normalizeLocale(trimmed);
    return byId.has(n) ? n : null;
  }
  return null;
}

/** Map URL / Accept-Language-ish tags onto a shipped locale; unknown → en. */
export function normalizeLocale(raw: string | null | undefined): string {
  if (!raw) return "en";
  const trimmed = raw.trim();
  if (!trimmed) return "en";
  if (byId.has(trimmed)) return trimmed;
  const lower = trimmed.toLowerCase();
  for (const [alias, id] of Object.entries(ALIASES)) {
    if (alias.toLowerCase() === lower && byId.has(id)) return id;
  }
  // zh-Hans-CN → zh-Hans
  const base = trimmed.split("-")[0];
  if (base === "zh") {
    const script = trimmed.toLowerCase();
    if (script.includes("hant") || script.includes("tw") || script.includes("hk")) return "zh-Hant";
    return "zh-Hans";
  }
  if (byId.has(base)) return base;
  const aliased = ALIASES[base];
  if (aliased && byId.has(aliased)) return aliased;
  return "en";
}

export function getLocaleEntry(id: string): LocaleEntry {
  return byId.get(normalizeLocale(id)) ?? byId.get("en")!;
}

export function localesInRegion(region: LocaleRegion): LocaleEntry[] {
  return LOCALE_CATALOG.filter((e) => e.region === region);
}

export function localeIntl(id: string): string {
  return getLocaleEntry(id).intl;
}

export function localeHtmlLang(id: string): string {
  return getLocaleEntry(id).htmlLang;
}

/** Portuguese message bags / legacy pt branches (Portugal + Brazil). */
export function isPortugueseLocale(id: string): boolean {
  const n = normalizeLocale(id);
  return n === "pt-PT" || n === "pt-BR";
}
