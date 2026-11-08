"use client";

import { useEffect, useState } from "react";
import type { Locale } from "../i18n/messages";
import { getMessages } from "../i18n/messages";

export type UiTheme = "dark" | "light";

const STORAGE_KEY = "buusdocst-ui-theme";

export function readStoredTheme(): UiTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function applyTheme(theme: UiTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

/** Apply stored theme as early as possible (call from AppShell mount). */
export function hydrateThemeFromStorage() {
  applyTheme(readStoredTheme());
}

function useThemeState() {
  const [theme, setTheme] = useState<UiTheme>("dark");

  useEffect(() => {
    const stored = readStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  function onChange(next: UiTheme) {
    setTheme(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function toggle() {
    onChange(theme === "dark" ? "light" : "dark");
  }

  return { theme, onChange, toggle };
}

/** One header button — shows the mode you switch into. */
export function ThemeToggle({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const { theme, toggle } = useThemeState();
  const nextLabel = theme === "dark" ? t.themeLight : t.themeDark;

  return (
    <button
      type="button"
      className="nav-link theme-toggle-btn"
      data-testid="theme-switch"
      aria-label={`${t.themeLabel}: ${nextLabel}`}
      title={`${t.themeLabel} — ${nextLabel}`}
      aria-pressed={theme === "light"}
      onClick={toggle}
    >
      {nextLabel}
    </button>
  );
}

/** Settings: one-line pointer to the header control (no second dual switch). */
export function ThemeSwitch({ locale }: { locale: Locale }) {
  const t = getMessages(locale);

  return (
    <div className="theme-switch" data-testid="theme-switch-settings">
      <p className="kicker">{t.themeLabel}</p>
      <p className="hint" data-testid="theme-header-hint">
        {t.themeHeaderHint}
      </p>
    </div>
  );
}
