"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FREQUENT_LOCALE_IDS,
  LOCALE_CATALOG,
  LOCALE_REGION_LABELS,
  LOCALE_REGION_ORDER,
  getLocaleEntry,
  localesInRegion,
  type LocaleEntry,
  type LocaleRegion
} from "../i18n/locales";
import { getMessages, type Locale } from "../i18n/messages";

type ShellView = "check" | "settings" | "privacy" | "lists-offline";

function pathForView(locale: string, view: ShellView, hash = ""): string {
  if (view === "settings") return `/${locale}/settings${hash}`;
  if (view === "privacy") return `/${locale}/privacy${hash}`;
  if (view === "lists-offline") return `/${locale}/lists-offline${hash}`;
  return `/${locale}${hash}`;
}

function shortBadge(id: string, native: string): string {
  if (id === "zh-Hans") return "简";
  if (id === "zh-Hant") return "繁";
  if (id === "pt-PT") return "PT";
  if (id === "pt-BR") return "BR";
  if (id === "en") return "EN";
  if (id.length <= 3) return id.toUpperCase();
  return native.slice(0, 2);
}

function matchesQuery(item: LocaleEntry, q: string): boolean {
  if (!q) return true;
  return (
    item.nativeName.toLowerCase().includes(q) ||
    item.englishName.toLowerCase().includes(q) ||
    item.id.toLowerCase().includes(q)
  );
}

export function LanguageSwitcher({
  locale,
  view,
  hash = ""
}: {
  locale: Locale;
  view: ShellView;
  hash?: string;
}) {
  const entry = getLocaleEntry(locale);
  const t = getMessages(locale);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<LocaleRegion | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const regionLabel = (region: LocaleRegion) => LOCALE_REGION_LABELS[region].en;

  const frequent = useMemo(() => {
    const q = query.trim().toLowerCase();
    const seen = new Set<string>();
    const list: LocaleEntry[] = [];
    // Current first, then shared Frequent strip.
    for (const id of [locale, ...FREQUENT_LOCALE_IDS]) {
      if (seen.has(id)) continue;
      seen.add(id);
      const item = getLocaleEntry(id);
      if (!matchesQuery(item, q)) continue;
      list.push(item);
    }
    return list;
  }, [locale, query]);

  const filteredByRegion = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LOCALE_REGION_ORDER.map((region) => {
      const items = localesInRegion(region).filter((item) => matchesQuery(item, q));
      return { region, items };
    }).filter((row) => row.items.length > 0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    // Regions stay collapsed until search or explicit expand — frequent strip only.
    setExpanded(null);
    setQuery("");
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (query.trim()) setExpanded(entry.region);
  }, [query, open, entry.region]);

  function go(next: string) {
    if (!next || next === locale) {
      setOpen(false);
      return;
    }
    setOpen(false);
    if (typeof window !== "undefined") {
      window.location.href = pathForView(next, view, hash);
    }
  }

  return (
    <div className="lang-switch" data-testid="locale-switch" ref={rootRef}>
      {/* Hidden native select: keeps Playwright selectOption + form semantics. */}
      <label className="visually-hidden">
        Language
        <select
          className="lang lang-select"
          data-testid="locale-select"
          aria-label="Language"
          value={locale}
          onChange={(e) => go(e.target.value)}
        >
          {LOCALE_REGION_ORDER.map((region) => {
            const items = localesInRegion(region);
            if (!items.length) return null;
            return (
              <optgroup key={region} label={regionLabel(region)}>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nativeName}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </label>

      <button
        type="button"
        className="lang-badge lang-badge-btn"
        data-testid="locale-toggle"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${entry.nativeName}`}
        onClick={() => setOpen((v) => !v)}
      >
        {shortBadge(entry.id, entry.nativeName)}
      </button>

      {open ? (
        <div
          className="lang-panel"
          data-testid="locale-panel"
          role="listbox"
          aria-label="Choose language"
        >
          <input
            ref={searchRef}
            className="lang-panel-search"
            data-testid="locale-search"
            type="search"
            placeholder={t.langPanelSearchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />

          <div className="lang-panel-frequent" data-testid="locale-frequent">
            <p className="lang-panel-kicker">{t.langPanelFrequent}</p>
            <ul className="lang-region-list">
              {frequent.map((item) => (
                <li key={`freq-${item.id}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={item.id === locale}
                    className={item.id === locale ? "lang-option is-current" : "lang-option"}
                    data-testid={`locale-option-${item.id}`}
                    onClick={() => go(item.id)}
                  >
                    <span className="lang-option-native">{item.nativeName}</span>
                    <span className="lang-option-en">{item.englishName}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lang-panel-regions">
            <p className="lang-panel-kicker">{t.langPanelAllRegions}</p>
            {filteredByRegion.map(({ region, items }) => {
              const isOpen = Boolean(query.trim()) || expanded === region;
              return (
                <div key={region} className="lang-region" data-testid={`locale-region-${region}`}>
                  <button
                    type="button"
                    className="lang-region-toggle"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setExpanded((cur) => (cur === region && !query.trim() ? null : region))
                    }
                  >
                    <span>{regionLabel(region)}</span>
                    <span className="lang-region-count">{items.length}</span>
                  </button>
                  {isOpen ? (
                    <ul className="lang-region-list">
                      {items.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={item.id === locale}
                            className={
                              item.id === locale ? "lang-option is-current" : "lang-option"
                            }
                            data-testid={`locale-option-region-${item.id}`}
                            onClick={() => go(item.id)}
                          >
                            <span className="lang-option-native">{item.nativeName}</span>
                            <span className="lang-option-en">{item.englishName}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
            {!filteredByRegion.length ? (
              <p className="lang-panel-empty" data-testid="locale-empty">
                No matches
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** For tests / docs: shipped locale count. */
export function shippedLocaleCount(): number {
  return LOCALE_CATALOG.length;
}
