"use client";

import { useEffect, useRef, useState } from "react";
import type { Analysis, CheckTiming } from "../security/analyse";
import { getMessages, type Locale } from "../i18n/messages";
import { UrlCheckForm } from "./UrlCheckForm";
import { RiskResult } from "./RiskResult";
import { TrafficLights } from "./TrafficLights";
import { SettingsPanel } from "./SettingsPanel";
import { PrivacyPanel } from "./PrivacyPanel";
import { reportAnalysis } from "./report-analysis";
import {
  listCheckHistory,
  pushCheckHistory,
  summarizeHeadFails,
  summarizeProbeTimeouts,
  type CheckHistoryEntry
} from "./check-history";
// Client-safe suggest helpers only — never import env-local or probe-budget (node:fs).
import { maxProbeAmongTimeouts, suggestProbeTimeoutMs } from "../security/probe-budget-suggest";
import { CopyEnvLine } from "./CopyEnvLine";
import { RateLimitBar } from "./RateLimitBar";
import {
  cancelAnnounceClear,
  scheduleAnnounceClear,
  type AnnounceClearTimerRef
} from "./rate-limit-announce";
import { formatTimingFlagChips, formatTimingSummaryLine, timingLabels } from "./timing-copy";
import { pushDiagnosticError } from "./diagnostic-log";
import {
  parseRetryAfterSec,
  resolveRetryAfterSec,
  retryAfterHeaderPreferred,
  retryAfterPreferenceDeltaSec
} from "../security/retry-after";
import { PROBE_TIMEOUT_ENV_KEY } from "../shared/probe-budget-copy.mjs";
import { replaceStateMaybeHashchange } from "../shared/spa-replace-state";

type ShellView = "check" | "settings" | "privacy";

function viewFromSlug(slug: string[]): ShellView {
  if (slug[0] === "settings") return "settings";
  if (slug[0] === "privacy") return "privacy";
  return "check";
}

function pathForView(locale: Locale, next: ShellView, hash = ""): string {
  if (next === "settings") return `/${locale}/settings${hash}`;
  if (next === "privacy") return `/${locale}/privacy${hash}`;
  return `/${locale}${hash}`;
}

const PROGRESS_STEPS = ["parse", "threat", "probe", "risk"] as const;

function formatMs(ms: number | null | undefined, unit: string): string {
  if (ms == null) return "—";
  return `${ms}${unit}`;
}

function resolveTimeoutSuggestion(timing: CheckTiming) {
  const historyMax = maxProbeAmongTimeouts(summarizeProbeTimeouts(listCheckHistory()));
  const thisProbe = typeof timing.probeMs === "number" ? timing.probeMs : null;
  const observed =
    historyMax == null
      ? thisProbe
      : thisProbe == null
        ? historyMax
        : Math.max(historyMax, thisProbe);
  const suggestion = suggestProbeTimeoutMs(timing.probeTimeoutMs, observed);
  return {
    suggestion,
    observed,
    envLine: `${PROBE_TIMEOUT_ENV_KEY}=${suggestion.suggestedMs}`
  };
}

function timeoutSuggestionMessage(template: string, timing: CheckTiming, unit: string): string {
  const { suggestion, observed } = resolveTimeoutSuggestion(timing);
  return template
    .replace("{suggested}", formatMs(suggestion.suggestedMs, unit))
    .replace("{current}", formatMs(suggestion.currentMs, unit))
    .replace("{observed}", observed != null ? formatMs(observed, unit) : "—");
}

function Header({
  locale,
  view,
  onNavigate
}: {
  locale: Locale;
  view: ShellView;
  onNavigate: (next: ShellView) => void;
}) {
  const t = getMessages(locale);
  const other = locale === "en" ? "pt-PT" : "en";
  const [viewHash, setViewHash] = useState("");
  useEffect(() => {
    if (view !== "privacy" && view !== "settings") {
      setViewHash("");
      return;
    }
    setViewHash(window.location.hash || "");
    function onHash() {
      setViewHash(window.location.hash || "");
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [view]);
  const settingsHash =
    view === "settings" &&
    (viewHash === "#settings-desktop" ||
      viewHash === "#settings-privacy" ||
      viewHash === "#settings-block-lists")
      ? viewHash
      : "";
  const privacyHash =
    view === "privacy" && viewHash.startsWith("#")
      ? viewHash
      : "";
  const otherPath =
    view === "settings"
      ? `/${other}/settings${settingsHash}`
      : view === "privacy"
        ? `/${other}/privacy${privacyHash}`
        : `/${other}`;
  return (
    <header className="top">
      <div className="brand">
        <h1 className="brand-lockup">
          <img
            className="brand-logo"
            src="/brand/buusdo-wordmark.png"
            width={117}
            height={40}
            decoding="async"
            alt={t.prototype}
          />
          <span className="visually-hidden">{t.prototype}</span>
        </h1>
      </div>
      <nav className="top-nav" aria-label={locale === "pt-PT" ? "Navegação" : "Navigation"}>
        <button
          type="button"
          className={`nav-link ${view === "check" ? "is-active" : ""}`}
          onClick={() => onNavigate("check")}
        >
          {t.navCheck}
        </button>
        <button
          type="button"
          className={`nav-link ${view === "settings" ? "is-active" : ""}`}
          onClick={() => onNavigate("settings")}
        >
          {t.navSettings}
        </button>
        <button
          type="button"
          className={`nav-link ${view === "privacy" ? "is-active" : ""}`}
          onClick={() => onNavigate("privacy")}
          data-testid="nav-privacy"
        >
          {t.navPrivacy}
        </button>
        <a
          className="lang"
          href={otherPath}
          data-testid="locale-toggle"
          aria-label={other === "pt-PT" ? "Mudar para português europeu" : "Switch to English"}
        >
          {locale === "en" ? "PT" : "EN"}
        </a>
      </nav>
    </header>
  );
}

function CheckProgress({
  locale,
  step,
  timing,
  timedOut,
  clientElapsedMs
}: {
  locale: Locale;
  step: number;
  timing?: CheckTiming | null;
  timedOut?: boolean;
  /** Wall-clock while the request is in flight; replaced by server timing when done. */
  clientElapsedMs?: number | null;
}) {
  const t = getMessages(locale);
  const labels = [t.progressParse, t.progressThreat, t.progressProbe, t.progressRisk];
  const msValues = timing
    ? [timing.parseMs, timing.threatMs, timing.probeMs, timing.riskMs]
    : [null, null, null, null];
  const done = step >= PROGRESS_STEPS.length || Boolean(timing);
  const envLine = timing && timedOut ? resolveTimeoutSuggestion(timing).envLine : "";

  return (
    <div className="check-progress" role="status" aria-live="polite">
      <div className="check-progress-head">
        <p className="kicker">{timing ? t.timingTitle : t.checking}</p>
        {timing ? (
          <p className="check-timing-total">
            <span className="check-timing-budget">
              {formatTimingSummaryLine(timing, timingLabels(t))}
            </span>
          </p>
        ) : (
          <p className="check-timing-total">
            {t.timingClientClock} {formatMs(clientElapsedMs ?? 0, t.timingMs)}
          </p>
        )}
      </div>
      {timing && (
        <p
          className="check-timing-flags"
          data-testid="progress-timing-flag-chips"
          aria-label={t.timingFlagsLabel || "Timing flags"}
        >
          {formatTimingFlagChips(timing, timingLabels(t)).map((chip) => (
            <span
              key={chip.id}
              className={`timing-flag-chip${chip.on ? " is-on" : ""}`}
              data-flag={chip.id}
              data-on={chip.on ? "1" : "0"}
            >
              {chip.text}
            </span>
          ))}
        </p>
      )}
      <ol>
        {PROGRESS_STEPS.map((id, index) => (
          <li
            key={id}
            className={
              done || index < step ? "is-done" : index === step ? "is-active" : ""
            }
          >
            <span className="check-step-label">{labels[index]}</span>
            <span className="check-step-ms">
              {timing ? formatMs(msValues[index], t.timingMs) : index === step ? "…" : "—"}
            </span>
          </li>
        ))}
      </ol>
      {timedOut && timing && (
        <div className="check-timing-timeout-row">
          <p className="scope-note check-timing-timeout">
            {timeoutSuggestionMessage(t.timingTimeout, timing, t.timingMs)}
          </p>
          <CopyEnvLine locale={locale} envLine={envLine} />
        </div>
      )}
    </div>
  );
}

function Home({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [clientElapsedMs, setClientElapsedMs] = useState(0);
  const [error, setError] = useState("");
  const [rateLimitSec, setRateLimitSec] = useState<number | null>(null);
  const [rateLimitTotal, setRateLimitTotal] = useState<number | null>(null);
  const [history, setHistory] = useState<CheckHistoryEntry[]>([]);
  const [probeBudgetMs, setProbeBudgetMs] = useState<number | null>(null);
  const [rateLimitAnnounce, setRateLimitAnnounce] = useState("");
  const wasRateLimited = useRef(false);
  /** Clears header-preferred / cleared announce so late setState cannot stick over bar ticks. */
  const rateLimitAnnounceClearTimer = useRef<AnnounceClearTimerRef["current"]>(null);
  const checkDisabled = rateLimitSec != null && rateLimitSec > 0;

  /**
   * Shared helper — keep title in sync with
   * tests/rate-limit-announce.test.ts → "scheduleAnnounceClear clears prior timer on a second 429".
   */
  function clearRateLimitAnnounceSoon(ms = 4000) {
    scheduleAnnounceClear(
      rateLimitAnnounceClearTimer,
      () => setRateLimitAnnounce(""),
      ms
    );
  }

  useEffect(() => {
    return () => {
      cancelAnnounceClear(rateLimitAnnounceClearTimer);
    };
  }, []);
  const rateLimitLabel =
    rateLimitSec != null
      ? rateLimitTotal != null && rateLimitTotal !== rateLimitSec
        ? t.errorRateLimit
            .replace("{sec}", String(rateLimitSec))
            .replace("{total}", String(rateLimitTotal))
        : t.errorRateLimitShort.replace("{sec}", String(rateLimitSec))
      : "";

  useEffect(() => {
    const timer = window.setTimeout(() => setHistory(listCheckHistory()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (checkDisabled) {
      wasRateLimited.current = true;
      return;
    }
    if (wasRateLimited.current) {
      wasRateLimited.current = false;
      setRateLimitAnnounce(t.rateLimitCleared);
      clearRateLimitAnnounceSoon(4000);
    }
  }, [checkDisabled, t.rateLimitCleared]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetch("/api/health")
        .then(async (response) => {
          const data = (await response.json()) as { ok?: boolean; probeTimeoutMs?: number };
          if (cancelled || !response.ok || !data.ok || typeof data.probeTimeoutMs !== "number") return;
          setProbeBudgetMs(data.probeTimeoutMs);
        })
        .catch(() => {
          /* idle budget is optional */
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!loading) return;
    const started = performance.now();
    const id = window.setInterval(() => {
      setClientElapsedMs(Math.round(performance.now() - started));
    }, 100);
    return () => window.clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (rateLimitSec == null || rateLimitSec <= 0) return;
    const id = window.setTimeout(() => {
      setRateLimitSec((prev) => (prev == null || prev <= 1 ? null : prev - 1));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [rateLimitSec]);

  const displayError =
    rateLimitSec != null && rateLimitSec > 0 ? rateLimitLabel : error;

  async function check(url: string) {
    setClientElapsedMs(0);
    setLoading(true);
    setError("");
    setRateLimitSec(null);
    setRateLimitTotal(null);
    setProgressStep(0);
    const timers = [
      window.setTimeout(() => setProgressStep(1), 180),
      window.setTimeout(() => setProgressStep(2), 420),
      window.setTimeout(() => setProgressStep(3), 900)
    ];
    try {
      const skipHeadHosts = summarizeHeadFails(listCheckHistory()).map((row) => row.domain);
      // Website UI never sends personalListBlocked — that hint is extension/desktop only.
      const response = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, skipHeadHosts })
      });
      let data: {
        ok?: boolean;
        analysis?: Analysis;
        error?: string;
        retryAfterSec?: number;
      } = {};
      try {
        data = (await response.json()) as typeof data;
      } catch {
        /* JSON may be empty; 429 still uses Retry-After header below */
      }
      if (response.status === 429) {
        const headerSec = parseRetryAfterSec(response.headers.get("Retry-After"), -1);
        const headerPreferred = retryAfterHeaderPreferred(headerSec, data.retryAfterSec);
        if (headerPreferred) {
          const deltaSec = retryAfterPreferenceDeltaSec(headerSec, data.retryAfterSec);
          pushDiagnosticError(
            "rate-limited-header-preferred",
            deltaSec != null ? { deltaSec } : undefined
          );
        }
        const sec = resolveRetryAfterSec(headerSec, data.retryAfterSec, 60);
        setRateLimitSec(sec);
        setRateLimitTotal(sec);
        // When Retry-After header wins, announce remaining seconds via the live region
        // (RateLimitBar also ticks through rate-limit-announce on 5s boundaries).
        // Clear after ~4s so the one-shot does not stick over bar ticks.
        if (headerPreferred) {
          setRateLimitAnnounce(
            sec === 1
              ? t.rateLimitTickOne
              : t.rateLimitTick.replace("{sec}", String(sec))
          );
          clearRateLimitAnnounceSoon(4000);
        }
        pushDiagnosticError("rate-limited");
        return;
      }
      if (!response.ok || !data.ok || !data.analysis) {
        const code = data.error || "check-failed";
        pushDiagnosticError(code);
        if (code === "url-required" || /invalid/i.test(code)) {
          setError(t.errorInvalidUrl);
        } else if (/timeout|ETIMEDOUT|aborted/i.test(code)) {
          setError(t.errorTimeout);
        } else {
          setError(t.errorGeneric);
        }
        return;
      }
      setProgressStep(4);
      setAnalysis(data.analysis);
      pushCheckHistory({
        domain: data.analysis.parsed.registrableDomain,
        level: data.analysis.risk.level,
        probeMs: data.analysis.timing?.probeMs ?? null,
        timedOut: Boolean(data.analysis.live?.timedOut),
        probeTimeoutMs: data.analysis.timing?.probeTimeoutMs,
        probeHeadFailed: Boolean(data.analysis.timing?.probeHeadFailed),
        headSkipped: Boolean(data.analysis.timing?.headSkipped),
        probeBlocked:
          Boolean(data.analysis.timing?.ambiguousProbeStatus) ||
          data.analysis.risk.evidence.some((e) => e.id === "probe-blocked")
      });
      setHistory(listCheckHistory());
      void reportAnalysis(data.analysis);
    } catch (err) {
      console.debug("[shield] check failed", err);
      const message = err instanceof Error ? err.message : "";
      pushDiagnosticError(/timeout|ETIMEDOUT|aborted/i.test(message) ? "timeout" : "check-failed");
      if (/timeout|ETIMEDOUT|aborted/i.test(message)) setError(t.errorTimeout);
      else setError(t.errorGeneric);
    } finally {
      timers.forEach((id) => window.clearTimeout(id));
      setLoading(false);
    }
  }

  if (analysis) {
    return (
      <main id="result" className="stage">
        <UrlCheckForm
          t={t}
          bare
          initialUrl={analysis.parsed.fullUrl}
          disabled={checkDisabled}
          onCheck={check}
        />
        {checkDisabled && rateLimitSec != null && rateLimitTotal != null && (
          <RateLimitBar
            sec={rateLimitSec}
            total={rateLimitTotal}
            label={rateLimitLabel}
            tickTemplate={t.rateLimitTick}
            tickTemplateOne={t.rateLimitTickOne}
          />
        )}
        <p className="visually-hidden" role="status" aria-live="polite">
          {rateLimitAnnounce}
        </p>
        {(loading || analysis.timing) && (
          <CheckProgress
            locale={locale}
            step={loading ? progressStep : 4}
            timing={loading ? null : analysis.timing}
            timedOut={Boolean(analysis.live?.timedOut)}
            clientElapsedMs={loading ? clientElapsedMs : null}
          />
        )}
        {displayError && (
          <p className="form-error" role="alert">
            {displayError}
          </p>
        )}
        <RiskResult
          key={analysis.parsed.registrableDomain}
          analysis={analysis}
          t={t}
          onReset={() => setAnalysis(null)}
        />
      </main>
    );
  }

  return (
    <main className="stage">
      <p className="kicker">{locale === "en" ? "Status" : "Estado"}</p>
      <TrafficLights
        level="idle"
        standby={t.lightStandby}
        safe={t.lightSafe}
        caution={t.lightCaution}
        danger={t.lightDanger}
      />
      <p className="light-note">{t.lightIdle}</p>
      {probeBudgetMs != null && (
        <p className="scope-note" role="status">
          {t.idleProbeBudget} {probeBudgetMs}
          {t.timingMs}
        </p>
      )}
      <UrlCheckForm t={t} bare disabled={checkDisabled} onCheck={check} />
      {checkDisabled && rateLimitSec != null && rateLimitTotal != null && (
        <RateLimitBar
          sec={rateLimitSec}
          total={rateLimitTotal}
          label={rateLimitLabel}
          tickTemplate={t.rateLimitTick}
          tickTemplateOne={t.rateLimitTickOne}
        />
      )}
      <p className="visually-hidden" role="status" aria-live="polite">
        {rateLimitAnnounce}
      </p>
      {loading && (
        <CheckProgress locale={locale} step={progressStep} clientElapsedMs={clientElapsedMs} />
      )}
      {displayError && !checkDisabled && (
        <p className="form-error" role="alert">
          {displayError}
        </p>
      )}
      {history.length > 0 && (
        <section className="check-history" aria-label={t.historyTitle}>
          <p className="kicker">{t.historyTitle}</p>
          <ul className="block-log">
            {history.slice(0, 8).map((entry) => (
              <li key={`${entry.domain}-${entry.at}`}>
                <span className="kind">{entry.level}</span>
                <span className="display">{entry.domain}</span>
                <span className="meta">
                  {entry.probeMs != null ? `${entry.probeMs}${t.timingMs}` : "—"}
                  {entry.timedOut ? ` · ${t.historyTimedOut}` : ""}
                  {entry.headSkipped ? ` · ${t.historyHeadSkipped}` : ""}
                  {" · "}
                  {new Date(entry.at).toLocaleString(locale === "pt-PT" ? "pt-PT" : "en-GB")}
                </span>
              </li>
            ))}
          </ul>
          <p className="scope-note">{t.historyNote}</p>
        </section>
      )}
    </main>
  );
}

export function AppShell({ locale, slug }: { locale: Locale; slug: string[] }) {
  const [view, setView] = useState<ShellView>(() => viewFromSlug(slug));

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setView(viewFromSlug(slug));
      // Full navigation from Leave-and-block (`/settings#settings-block-lists`).
      if (slug[0] === "settings" && window.location.hash === "#settings-block-lists") {
        window.dispatchEvent(new Event("shield:settings-block-lists"));
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [slug]);

  // Privacy deep-links (e.g. Settings → #privacy-honest-limits): scroll after the
  // privacy panel mounts so view-switch does not race the hash target.
  useEffect(() => {
    if (view !== "privacy") return;
    function scrollPrivacyHash() {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (hash !== "#privacy-honest-limits") return;
      const el = document.getElementById("privacy-honest-limits");
      el?.scrollIntoView({ block: "start" });
    }
    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollPrivacyHash);
    });
    window.addEventListener("hashchange", scrollPrivacyHash);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("hashchange", scrollPrivacyHash);
    };
  }, [view, slug]);

  // Settings hash-only updates while already on Settings (SPA) — scroll #settings-desktop.
  useEffect(() => {
    if (view !== "settings") return;
    function scrollSettingsDesktopHash() {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (hash !== "#settings-desktop") return;
      document.getElementById("settings-desktop")?.scrollIntoView({ block: "start" });
    }
    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollSettingsDesktopHash);
    });
    window.addEventListener("hashchange", scrollSettingsDesktopHash);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("hashchange", scrollSettingsDesktopHash);
    };
  }, [view, slug]);

  function navigate(next: ShellView, hashOverride?: string) {
    const alreadySettings = view === "settings";
    setView(next);
    // Already on Settings → block-lists; first open → data section.
    let hash = hashOverride ?? "";
    if (!hash && next === "settings") {
      hash = alreadySettings ? "#settings-block-lists" : "#settings-privacy";
    }
    const path = pathForView(locale, next, hash);
    if (typeof window !== "undefined") {
      // SPA: vinext soft nav may emit framenavigated — Playwright asserts document `load` only
      // (@see playwright/helpers/spa-settings-nav.ts + settings-honest-limits flake note).
      replaceStateMaybeHashchange(path);
      if (next === "settings") {
        window.setTimeout(() => {
          if (hash === "#settings-desktop") {
            // Privacy mirror note (SPA) or deep-link — scroll downloads into view.
            document.getElementById("settings-desktop")?.scrollIntoView({ block: "start" });
            return;
          }
          if (alreadySettings || hash === "#settings-block-lists") {
            window.dispatchEvent(new Event("shield:settings-block-lists"));
            const live = document.querySelector<HTMLElement>('[data-testid="settings-block-lists-live"]');
            (live || document.getElementById("settings-block-lists"))?.scrollIntoView({
              block: "start"
            });
          } else {
            window.dispatchEvent(new Event("shield:settings-privacy"));
            const select = document.getElementById("settings-data-select");
            if (select instanceof HTMLSelectElement) select.focus();
          }
        }, 0);
      }
      if (next === "privacy" && hash === "#privacy-honest-limits") {
        window.setTimeout(() => {
          document.getElementById("privacy-honest-limits")?.scrollIntoView({ block: "start" });
        }, 0);
      }
    }
  }

  return (
    <div className="shell">
      <Header locale={locale} view={view} onNavigate={navigate} />
      {view === "settings" ? (
        <SettingsPanel
          locale={locale}
          onBack={() => navigate("check")}
          onOpenHonestLimits={() => navigate("privacy", "#privacy-honest-limits")}
        />
      ) : view === "privacy" ? (
        <PrivacyPanel
          locale={locale}
          onBack={() => navigate("check")}
          onOpenDesktopDownloads={() => navigate("settings", "#settings-desktop")}
        />
      ) : (
        <Home locale={locale} />
      )}
    </div>
  );
}