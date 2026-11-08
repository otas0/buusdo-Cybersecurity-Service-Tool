"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LOCALE_CATALOG,
  getLocaleEntry,
  normalizeLocale,
  recommendPinnedLocaleIds,
  type LocaleRegion
} from "../i18n/locales";
import { getMessages, type Locale } from "../i18n/messages";

const CHOICE_KEY = "buusdocst-locale-choice";
const DISMISS_KEY = "buusdocst-locale-recommend-dismiss";

function regionHintsFromBrowser(): LocaleRegion[] {
  const langs = typeof navigator !== "undefined" ? navigator.languages || [navigator.language] : ["en"];
  const regions = new Set<LocaleRegion>();
  for (const raw of langs) {
    const id = normalizeLocale(raw);
    const entry = getLocaleEntry(id);
    regions.add(entry.region);
    const lower = raw.toLowerCase();
    if (lower.startsWith("zh")) regions.add("east-asia");
    if (lower.startsWith("ja")) regions.add("east-asia");
    if (lower.startsWith("th") || lower.startsWith("vi") || lower.startsWith("id") || lower.startsWith("ms")) {
      regions.add("southeast-asia");
    }
    if (
      lower.startsWith("af") ||
      lower.startsWith("zu") ||
      lower.startsWith("xh") ||
      lower.startsWith("ss") ||
      lower.startsWith("ve") ||
      lower.startsWith("ts") ||
      lower.startsWith("nr") ||
      lower.startsWith("nso") ||
      lower.startsWith("st") ||
      lower.startsWith("tn") ||
      lower.includes("-za") ||
      lower.includes("-sz") ||
      lower.includes("-zw")
    ) {
      regions.add("southern-africa");
    }
    if (lower.startsWith("mi") || lower.includes("-nz")) regions.add("pacific");
  }
  return [...regions];
}

function suggestLocale(): string {
  if (typeof navigator === "undefined") return "en";
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const raw of langs) {
    const id = normalizeLocale(raw);
    if (id !== "en") return id;
  }
  return normalizeLocale(langs[0] || "en");
}

export function LocaleRecommendModal({
  locale,
  view,
  hash = ""
}: {
  locale: Locale;
  view: "check" | "settings" | "privacy" | "lists-offline";
  hash?: string;
}) {
  const t = getMessages(locale);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const suggested = useMemo(() => suggestLocale(), []);
  const suggestedEntry = getLocaleEntry(suggested);

  /** Short pin list (max 6, no search) — shared helper with unit/Playwright snapshots. */
  const pinned = useMemo(
    () => recommendPinnedLocaleIds(suggested).map((id) => getLocaleEntry(id)),
    [suggested]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pinned;
    return LOCALE_CATALOG.filter(
      (item) =>
        item.nativeName.toLowerCase().includes(q) ||
        item.englishName.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
    ).slice(0, 12);
  }, [pinned, query]);

  useEffect(() => {
    try {
      if (localStorage.getItem(CHOICE_KEY) || localStorage.getItem(DISMISS_KEY)) {
        setOpen(false);
        return;
      }
      if (suggested === locale) {
        localStorage.setItem(CHOICE_KEY, locale);
        setOpen(false);
        return;
      }
      setOpen(true);
    } catch {
      setOpen(false);
    }
  }, [locale, suggested]);

  function pathFor(next: string): string {
    if (view === "settings") return `/${next}/settings${hash}`;
    if (view === "privacy") return `/${next}/privacy${hash}`;
    if (view === "lists-offline") return `/${next}/lists-offline${hash}`;
    return `/${next}${hash}`;
  }

  function accept(next: string) {
    try {
      localStorage.setItem(CHOICE_KEY, next);
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    window.location.href = pathFor(next);
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
      localStorage.setItem(CHOICE_KEY, locale);
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;

  const body = t.localeRecommendBody.replace("{lang}", suggestedEntry.nativeName);
  const acceptLabel = t.localeRecommendAccept.replace("{lang}", suggestedEntry.nativeName);

  return (
    <div className="locale-recommend" role="dialog" aria-modal="true" data-testid="locale-recommend">
      <div className="locale-recommend-card">
        <p className="kicker">{t.localeRecommendTitle}</p>
        <p className="hint">{body}</p>
        <div className="action-row">
          <button
            type="button"
            className="text-button"
            data-testid="locale-recommend-accept"
            onClick={() => accept(suggested)}
          >
            {acceptLabel}
          </button>
          <button
            type="button"
            className="text-button"
            data-testid="locale-recommend-dismiss"
            onClick={dismiss}
          >
            {t.localeRecommendDismiss}
          </button>
        </div>
        <label className="hint locale-recommend-picker">
          <span className="visually-hidden">{t.localeRecommendTitle}</span>
          <input
            className="locale-recommend-search"
            data-testid="locale-recommend-search"
            type="search"
            placeholder={t.langPanelSearchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          {/* Hidden select kept for existing Playwright selectOption helpers. */}
          <select
            className="visually-hidden"
            data-testid="locale-recommend-select"
            value={suggested}
            onChange={(e) => accept(e.target.value)}
          >
            {LOCALE_CATALOG.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nativeName}
              </option>
            ))}
          </select>
          <ul className="locale-recommend-list" data-testid="locale-recommend-list">
            {filtered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={item.id === suggested ? "lang-option is-current" : "lang-option"}
                  data-testid={`locale-recommend-option-${item.id}`}
                  onClick={() => accept(item.id)}
                >
                  <span className="lang-option-native">{item.nativeName}</span>
                  <span className="lang-option-en">{item.englishName}</span>
                </button>
              </li>
            ))}
          </ul>
          {!filtered.length ? (
            <p className="lang-panel-empty" data-testid="locale-recommend-empty">
              {t.langPanelNoMatches}
            </p>
          ) : null}
        </label>
      </div>
    </div>
  );
}

/** First-visit Accept-Language soft redirect when no choice stored and path is /en. */
export function maybeAcceptLanguageRedirect(currentLocale: string): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(CHOICE_KEY) || localStorage.getItem(DISMISS_KEY)) return;
    if (currentLocale !== "en") return;
    const suggested = suggestLocale();
    if (suggested === "en") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("alang") === "1") {
      localStorage.setItem(CHOICE_KEY, suggested);
      const path = window.location.pathname.replace(/^\/[^/]+/, `/${suggested}`);
      window.location.replace(path + window.location.search + window.location.hash);
    }
  } catch {
    /* ignore */
  }
}
