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

export function ThemeSwitch({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
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

  return (
    <div className="theme-switch" data-testid="theme-switch">
      <p className="kicker" id="theme-switch-label">
        {t.themeLabel}
      </p>
      <div className="theme-switch-row" role="group" aria-labelledby="theme-switch-label">
        <button
          type="button"
          className={`text-button theme-opt${theme === "dark" ? " is-active" : ""}`}
          data-testid="theme-dark"
          aria-pressed={theme === "dark"}
          onClick={() => onChange("dark")}
        >
          {t.themeDark}
        </button>
        <button
          type="button"
          className={`text-button theme-opt${theme === "light" ? " is-active" : ""}`}
          data-testid="theme-light"
          aria-pressed={theme === "light"}
          onClick={() => onChange("light")}
        >
          {t.themeLight}
        </button>
      </div>
      <p className="hint">{t.themeHint}</p>
    </div>
  );
}
