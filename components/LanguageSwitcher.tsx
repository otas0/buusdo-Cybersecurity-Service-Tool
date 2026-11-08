"use client";

import {
  LOCALE_CATALOG,
  LOCALE_REGION_LABELS,
  LOCALE_REGION_ORDER,
  getLocaleEntry,
  localesInRegion,
  type LocaleRegion
} from "../i18n/locales";
import type { Locale } from "../i18n/messages";

type ShellView = "check" | "settings" | "privacy" | "lists-offline";

function pathForView(locale: string, view: ShellView, hash = ""): string {
  if (view === "settings") return `/${locale}/settings${hash}`;
  if (view === "privacy") return `/${locale}/privacy${hash}`;
  if (view === "lists-offline") return `/${locale}/lists-offline${hash}`;
  return `/${locale}${hash}`;
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
  const regionLabel = (region: LocaleRegion) =>
    LOCALE_REGION_LABELS[region].en;

  return (
    <label className="lang-switch" data-testid="locale-switch">
      <span className="visually-hidden">Language</span>
      <select
        className="lang lang-select"
        data-testid="locale-select"
        aria-label="Language"
        value={locale}
        onChange={(e) => {
          const next = e.target.value;
          if (typeof window !== "undefined") {
            window.location.assign(pathForView(next, view, hash));
          }
        }}
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
      {/* Compact badge for narrow nav; mirrors selected native name short form */}
      <span className="lang-badge" aria-hidden="true" data-testid="locale-toggle">
        {shortBadge(entry.id, entry.nativeName)}
      </span>
    </label>
  );
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

/** For tests / docs: shipped locale count. */
export function shippedLocaleCount(): number {
  return LOCALE_CATALOG.length;
}
