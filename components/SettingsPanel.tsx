"use client";

import { useEffect, useState } from "react";
import type { Locale } from "../i18n/messages";
import { getMessages, isPortugueseLocale } from "../i18n/messages";
import { localeIntl } from "../i18n/locales";
import {
  applyPrivacyModeChange,
  canPersistLists,
  clearProtectionLists
} from "./privacy-storage";
import {
  getPrivacyMode,
  setPrivacyMode,
  type PrivacyMode
} from "./report-analysis";
import {
  clearCheckHistory,
  filterCheckHistory,
  listCheckHistory,
  summarizeHeadFails,
  summarizeProbeTimeouts,
  type CheckHistoryEntry
} from "./check-history";
import {
  clearFeedbackDrafts,
  clearReportDraftHint,
  deleteFeedbackDraft,
  exportFeedbackBatchDownload,
  hadReportDraftHint,
  listFeedbackDrafts,
  type FeedbackDraft
} from "./feedback-drafts";
import {
  clearDiagnosticLog,
  lastHeaderPreferredDiagnostic,
  listDiagnosticErrors,
  summarizeDiagnosticErrors,
  type DiagnosticEntry
} from "./diagnostic-log";
import { buildRiskNotes, summarizeExportPlan } from "../security/feedback-batch";
import { maxProbeAmongTimeouts, suggestProbeTimeoutMs } from "../security/probe-budget-suggest";
import { CopyEnvLine } from "./CopyEnvLine";
import extensionStores from "../shared/extension-stores.json" with { type: "json" };
import desktopDownloads from "../shared/desktop-downloads.json" with { type: "json" };
import {
  macDownloadUrl,
  macMirrorUrl,
  resolveDesktopDownloads
} from "../shared/desktop-downloads-resolve";
import {
  downloadFullHistoryCsv,
  downloadTimeoutSummaryCsv,
  type FullHistoryCsvFilter
} from "./check-history-csv";
import { probeBudgetCopy, PROBE_TIMEOUT_ENV_KEY } from "../shared/probe-budget-copy.mjs";
import { formatTimingFlagChips, timingLabels } from "./timing-copy";
import type { CheckTiming } from "../security/analyse";
const CHROME_STORE_URL = String(extensionStores.chromeWebStoreUrl || "").trim();
const SAFARI_STORE_URL = String(extensionStores.safariAppStoreUrl || "").trim();
const STORE_DOCS_URL =
  "https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/blob/main/docs/EXTENSION_STORE_DISTRIBUTE.md";
const EXT_SETUP_DOCS_URL =
  "https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/blob/main/docs/EXTENSION_CHROME_SAFARI.md";
const DESKTOP_MIRRORS =
  desktopDownloads.mirrors && typeof desktopDownloads.mirrors === "object"
    ? (desktopDownloads.mirrors as Record<string, string>)
    : {};
function desktopUrl(primary: string, mirrorKey: string) {
  const mirror = String(DESKTOP_MIRRORS[mirrorKey] || "").trim();
  return mirror || String(primary || "").trim();
}
const DESKTOP_WIN_URL = desktopUrl(desktopDownloads.windowsNsisUrl, "windowsNsisUrl");
const DESKTOP_MAC_URL = desktopUrl(desktopDownloads.macosAppZipUrl, "macosAppZipUrl");
const DESKTOP_LINUX_URL = desktopUrl(desktopDownloads.linuxDebAmd64Url, "linuxDebAmd64Url");
const DESKTOP_PACKAGING_URL = String(desktopDownloads.packagingDocsUrl || STORE_DOCS_URL).trim();
const DESKTOP_SETUP_GUIDE_URL = String(desktopDownloads.setupGuideUrl || DESKTOP_PACKAGING_URL).trim();
const DESKTOP_RELEASE_URL = String(desktopDownloads.releaseNotesUrl || DESKTOP_PACKAGING_URL).trim();
const DESKTOP_RELEASE_TAG = String(desktopDownloads.releaseTag || "").trim();

/** Legend timing — labels only; same helper as RiskResult chips. */
const TIMING_FLAG_LEGEND: CheckTiming = {
  parseMs: 0,
  threatMs: 0,
  probeMs: null,
  riskMs: 0,
  totalMs: 0,
  probeTimeoutMs: 1,
  probeHeadFailed: false,
  headSkipped: false,
  ambiguousProbeStatus: false
};

function formatHeadSkipRelative(
  untilIso: string,
  t: { headSkipExpiresIn: string; headSkipExpiresInOne: string; headSkipExpired: string }
): string {
  const ms = new Date(untilIso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return t.headSkipExpired;
  const mins = Math.max(1, Math.round(ms / 60_000));
  if (mins === 1) return t.headSkipExpiresInOne;
  return t.headSkipExpiresIn.replace("{m}", String(mins));
}

function formatDiagnosticCode(
  code: string,
  t: {
    diagnosticRateLimited: string;
    diagnosticRateLimitedHeaderPreferred: string;
  }
): string {
  if (code === "rate-limited-header-preferred") return t.diagnosticRateLimitedHeaderPreferred;
  if (code === "rate-limited") return t.diagnosticRateLimited;
  return code;
}

export function SettingsPanel({
  locale,
  onBack,
  onOpenHonestLimits
}: {
  locale: Locale;
  onBack: () => void;
  onOpenHonestLimits?: () => void;
}) {
  const t = getMessages(locale);
  const enMsg = getMessages("en");
  const ptMsg = getMessages("pt-PT");
  // Localize CDN SR copy only when EN/pt-PT mirror-related strings diverge.
  const cdnCopyDiverges =
    enMsg.privacyDesktopMirrorNote !== ptMsg.privacyDesktopMirrorNote ||
    enMsg.desktopDownloadSourceCdn !== ptMsg.desktopDownloadSourceCdn ||
    enMsg.desktopDownloadMacSource !== ptMsg.desktopDownloadMacSource;
  // After mount so SSR/hydration stay aligned; Playwright stubs via window.__SHIELD_TEST_DESKTOP_DOWNLOADS__.
  const [showMacSource, setShowMacSource] = useState(false);
  const [macHref, setMacHref] = useState(DESKTOP_MAC_URL);
  const [macPromoteNote, setMacPromoteNote] = useState<"none" | "unsigned-until-promote" | "ready-to-promote">(
    "none"
  );
  const macCdnDesc =
    showMacSource && macHref
      ? cdnCopyDiverges
        ? t.desktopDownloadMacSource.replace(
            "{source}",
            `${t.desktopDownloadSourceCdn} — ${macHref}`
          )
        : macHref
      : undefined;
  const [mode, setMode] = useState<PrivacyMode>("off");
  const [history, setHistory] = useState<CheckHistoryEntry[]>([]);
  const [drafts, setDrafts] = useState<FeedbackDraft[]>([]);
  const [showAfterReportHint, setShowAfterReportHint] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticEntry[]>([]);
  const [notice, setNotice] = useState("");
  const [probeBudgetMs, setProbeBudgetMs] = useState<number | null>(null);
  const [probeBudgetStatus, setProbeBudgetStatus] = useState<"loading" | "ok" | "error">("loading");
  const [ownThreatMergePt, setOwnThreatMergePt] = useState<boolean | null>(null);
  const [headSkipEntries, setHeadSkipEntries] = useState<
    Array<{ domain: string; fails?: number; until?: string }>
  >([]);
  const [isDevServer, setIsDevServer] = useState(false);
  const [historyTimeoutsOnly, setHistoryTimeoutsOnly] = useState(false);
  const [historyHeadSkippedOnly, setHistoryHeadSkippedOnly] = useState(false);
  const [historyProbeBlockedOnly, setHistoryProbeBlockedOnly] = useState(false);
  const [historyCsvFilter, setHistoryCsvFilter] = useState<FullHistoryCsvFilter>("all");
  /** Briefly highlights the CSV radio when list checkboxes auto-sync the filter. */
  const [csvFlash, setCsvFlash] = useState<FullHistoryCsvFilter | null>(null);
  /** Bumps every 30s so headSkip “expires in” relative copy stays fresh. */
  const [headSkipClock, setHeadSkipClock] = useState(0);
  const [exportReviewedBy, setExportReviewedBy] = useState("");
  const [exportNotes, setExportNotes] = useState("");
  const [checklistHosts, setChecklistHosts] = useState(false);
  const [checklistFp, setChecklistFp] = useState(false);
  const [checklistReady, setChecklistReady] = useState(false);
  /** Narrow viewports: intelBody stays collapsed behind More until toggled. */
  const [intelMoreOpen, setIntelMoreOpen] = useState(false);

  function applyHealth(data: {
    ok?: boolean;
    probeTimeoutMs?: number;
    ownThreatMergePt?: boolean;
    headSkipDomains?: unknown;
    headSkipEntries?: unknown;
  }) {
    if (!data.ok || typeof data.probeTimeoutMs !== "number") {
      setProbeBudgetStatus("error");
      return;
    }
    setProbeBudgetMs(data.probeTimeoutMs);
    setProbeBudgetStatus("ok");
    if (typeof data.ownThreatMergePt === "boolean") setOwnThreatMergePt(data.ownThreatMergePt);
    if (Array.isArray(data.headSkipEntries)) {
      const next: Array<{ domain: string; fails?: number; until?: string }> = [];
      for (const row of data.headSkipEntries) {
        if (!row || typeof row !== "object") continue;
        const r = row as { domain?: string; fails?: number; until?: string };
        if (!r.domain) continue;
        next.push({
          domain: String(r.domain),
          fails: typeof r.fails === "number" ? r.fails : undefined,
          until: typeof r.until === "string" ? r.until : undefined
        });
      }
      setHeadSkipEntries(next);
    } else if (Array.isArray(data.headSkipDomains)) {
      setHeadSkipEntries(
        data.headSkipDomains
          .map((d) => ({ domain: String(d) }))
          .filter((r) => Boolean(r.domain))
      );
    }
  }

  useEffect(() => {
    const downloads = resolveDesktopDownloads();
    setShowMacSource(Boolean(macMirrorUrl(downloads)));
    setMacHref(macDownloadUrl(downloads) || DESKTOP_MAC_URL);
    const primary = String(downloads.macosAppZipUrl || "").trim();
    const notarized = String(downloads.macosAppZipUrlNotarized || "").trim();
    const unsigned = String(downloads.macosAppZipUrlUnsigned || "").trim();
    const primaryIsNotarized = Boolean(notarized && primary === notarized);
    const notPromoted =
      Boolean(notarized) &&
      ((unsigned && primary === unsigned) || (primary && primary !== notarized));
    // Unsigned GitHub ship: show Gatekeeper/SmartScreen note whenever primary is not notarized.
    setMacPromoteNote(primary && !primaryIsNotarized ? "unsigned-until-promote" : "none");
    let cancelled = false;
    void fetch("/api/desktop-downloads/status")
      .then((r) => r.json())
      .then((raw: unknown) => {
        if (cancelled) return;
        const data =
          raw && typeof raw === "object" ? (raw as { macNote?: string }) : null;
        if (data?.macNote === "ready-to-promote" || data?.macNote === "unsigned-until-promote") {
          setMacPromoteNote(data.macNote);
        } else if (!(primary && !primaryIsNotarized) && !notPromoted) {
          setMacPromoteNote("none");
        }
      })
      .catch(() => {
        /* keep static note */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsDevServer(process.env.NODE_ENV !== "production");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setHeadSkipClock((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const next: FullHistoryCsvFilter | null = historyProbeBlockedOnly
      ? "probeBlocked"
      : historyHeadSkippedOnly
        ? "headSkipped"
        : historyTimeoutsOnly
          ? "timedOut"
          : null;
    if (!next) return;
    // Defer so toggle → filter sync is not a sync setState-in-effect cascade.
    const id = window.setTimeout(() => {
      setHistoryCsvFilter(next);
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      if (reduceMotion) {
        setCsvFlash(null);
        return;
      }
      // CSS @keyframes handles the pulse — re-trigger by clearing then setting.
      setCsvFlash(null);
      window.requestAnimationFrame(() => setCsvFlash(next));
    }, 0);
    return () => window.clearTimeout(id);
  }, [historyHeadSkippedOnly, historyTimeoutsOnly, historyProbeBlockedOnly]);

  function refresh() {
    const next = getPrivacyMode();
    setMode(next);
    setHistory(listCheckHistory());
    setDrafts(listFeedbackDrafts());
    setShowAfterReportHint(hadReportDraftHint());
    setDiagnostics(listDiagnosticErrors());
  }

  useEffect(() => {
    const timer = window.setTimeout(() => refresh(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetch("/api/health")
        .then(async (response) => {
          const data = (await response.json()) as {
            ok?: boolean;
            probeTimeoutMs?: number;
            ownThreatMergePt?: boolean;
          };
          if (cancelled) return;
          if (!response.ok) {
            setProbeBudgetStatus("error");
            return;
          }
          applyHealth(data);
        })
        .catch(() => {
          if (!cancelled) setProbeBudgetStatus("error");
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setExportNotes(drafts.length ? buildRiskNotes(drafts) : "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [drafts]);

  useEffect(() => {
    function focusPrivacySelect() {
      if (typeof window === "undefined") return;
      if (window.location.hash !== "#settings-privacy") return;
      const select = document.getElementById("settings-data-select");
      if (select instanceof HTMLSelectElement) select.focus();
    }
    function focusBlockLists(ev?: Event) {
      if (typeof window === "undefined") return;
      const fromCustom = ev?.type === "shield:settings-block-lists";
      if (!fromCustom && window.location.hash !== "#settings-block-lists") return;
      // Leave-and-block / hash open: bring deep-link row into view on first Settings paint.
      const live = document.querySelector<HTMLElement>('[data-testid="settings-block-lists-live"]');
      const section = document.getElementById("settings-block-lists");
      (live || section)?.scrollIntoView({ block: "start" });
    }
    function focusDesktop() {
      if (typeof window === "undefined") return;
      if (window.location.hash !== "#settings-desktop") return;
      // Locale full navigation keeps #settings-desktop — scroll into view after load.
      document.getElementById("settings-desktop")?.scrollIntoView({ block: "start" });
    }
    const timer = window.setTimeout(() => {
      focusPrivacySelect();
      focusBlockLists();
      focusDesktop();
    }, 0);
    window.addEventListener("hashchange", focusPrivacySelect);
    window.addEventListener("hashchange", focusBlockLists);
    window.addEventListener("hashchange", focusDesktop);
    window.addEventListener("shield:settings-privacy", focusPrivacySelect);
    window.addEventListener("shield:settings-block-lists", focusBlockLists);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", focusPrivacySelect);
      window.removeEventListener("hashchange", focusBlockLists);
      window.removeEventListener("hashchange", focusDesktop);
      window.removeEventListener("shield:settings-privacy", focusPrivacySelect);
      window.removeEventListener("shield:settings-block-lists", focusBlockLists);
    };
  }, []);

  function onPrivacyChange(next: PrivacyMode) {
    setPrivacyMode(next);
    applyPrivacyModeChange(next);
    setMode(next);
    setHistory(listCheckHistory());
    setDrafts(listFeedbackDrafts());
    setDiagnostics(listDiagnosticErrors());
    setNotice("");
  }

  function onReset() {
    clearProtectionLists();
    clearCheckHistory();
    clearFeedbackDrafts();
    clearDiagnosticLog();
    setHistory([]);
    setDrafts([]);
    setDiagnostics([]);
    setNotice(t.resetDone);
  }

  const persist = canPersistLists(mode);
  const timeoutHosts = summarizeProbeTimeouts(history);
  const headFailHosts = summarizeHeadFails(history);
  const diagnosticSummary = summarizeDiagnosticErrors(diagnostics);
  const lastHeaderPreferred = lastHeaderPreferredDiagnostic(diagnostics);
  const observedMax = maxProbeAmongTimeouts(timeoutHosts);
  const suggestion =
    probeBudgetMs != null ? suggestProbeTimeoutMs(probeBudgetMs, observedMax) : null;
  const budgetCopy = probeBudgetCopy(locale);
  const visibleHistory = filterCheckHistory(
    history,
    historyProbeBlockedOnly
      ? "probeBlocked"
      : historyHeadSkippedOnly
        ? "headSkipped"
        : historyTimeoutsOnly
          ? "timeouts"
          : "all"
  );
  const exportPlan = summarizeExportPlan(drafts);
  const exportPlanCopy = t.feedbackExportPlan
    .replace("{hosts}", String(exportPlan.hostCount))
    .replace("{add}", String(exportPlan.addCount))
    .replace("{remove}", String(exportPlan.removeCount));

  return (
    <main className="stage settings-stage">
      <p className="kicker">{t.navSettings}</p>
      <p className="light-note">{t.settingsIntro}</p>

      <section className="settings-block" id="settings-data">
        <h2>{t.intelTitle}</h2>
        {/* Timing legend first so it stays above the fold on 390px pt-PT (before long intelBody). */}
        <p className="check-timing-flags settings-timing-legend" data-testid="settings-timing-flag-legend" aria-label={t.timingFlagsLabel || "Timing flags"}>
          {formatTimingFlagChips(TIMING_FLAG_LEGEND, timingLabels(t)).map((chip) => (
            <span key={chip.id} className="timing-flag-chip" data-flag={chip.id} data-on="0" title={chip.label}>
              {chip.label}
            </span>
          ))}
        </p>
        <button
          type="button"
          className="text-button details-toggle intel-body-more-toggle"
          data-testid="settings-intel-more"
          aria-expanded={intelMoreOpen}
          onClick={() => setIntelMoreOpen((v) => !v)}
        >
          {intelMoreOpen ? t.intelLess : t.intelMore}
        </button>
        <p className={`hint intel-body${intelMoreOpen ? " is-open" : ""}`}>{t.intelBody}</p>
        <ul className="block-log probe-budget-log">
          <li>
            <span className="kind">{t.intelProbeBudget}</span>
            <span className="display">
              {probeBudgetStatus === "loading" && t.intelProbeLoading}
              {probeBudgetStatus === "error" && t.intelProbeUnavailable}
              {probeBudgetStatus === "ok" && probeBudgetMs != null && `${probeBudgetMs}${t.timingMs}`}
            </span>
            <span className="meta">{PROBE_TIMEOUT_ENV_KEY} · /api/health</span>
          </li>
          <li>
            <span className="kind">{t.intelProbeObserved}</span>
            <span className="display">
              {observedMax != null ? `${observedMax}${t.timingMs}` : "—"}
            </span>
          </li>
          <li>
            <span className="kind">{t.intelProbeSuggested}</span>
            <span className="display">
              {suggestion ? `${suggestion.suggestedMs}${t.timingMs}` : "—"}
            </span>
            <span className="meta">
              {budgetCopy.formula}{" "}
              {suggestion?.shouldRaise ? t.intelProbeRaise : suggestion ? t.intelProbeOk : ""}
            </span>
          </li>
          <li>
            <span className="kind">{t.intelMergePt}</span>
            <span className="display">
              {ownThreatMergePt == null
                ? "—"
                : ownThreatMergePt
                  ? t.intelMergePtOn
                  : t.intelMergePtOff}
            </span>
            <span className="meta">OWN_THREAT_MERGE_PT · /api/health</span>
          </li>
        </ul>
        {isDevServer && ownThreatMergePt != null && (
          <label className="history-filter">
            <input
              type="checkbox"
              checked={ownThreatMergePt}
              onChange={(e) => {
                const next = e.target.checked;
                void fetch("/api/dev/probe-env", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ownThreatMergePt: next })
                })
                  .then(async (response) => {
                    const data = (await response.json()) as {
                      ok?: boolean;
                      ownThreatMergePt?: boolean;
                      fileWriteDenied?: boolean;
                      usedFallbackPath?: string;
                      path?: string | null;
                    };
                    if (!response.ok || !data.ok) {
                      setNotice(t.intelWriteEnvFail);
                      return;
                    }
                    if (typeof data.ownThreatMergePt === "boolean") {
                      setOwnThreatMergePt(data.ownThreatMergePt);
                    } else {
                      setOwnThreatMergePt(next);
                    }
                    if (data.fileWriteDenied && data.usedFallbackPath) {
                      setNotice(
                        t.intelMergePtWriteFallbackPath.replace("{path}", data.usedFallbackPath)
                      );
                    } else if (data.fileWriteDenied) {
                      setNotice(t.intelMergePtWriteSessionOnly);
                    } else {
                      setNotice(t.intelMergePtWriteOk);
                    }
                  })
                  .catch(() => setNotice(t.intelWriteEnvFail));
              }}
            />
            <span>{t.intelMergePtToggle}</span>
          </label>
        )}
        <h3 className="settings-subhead">{t.headSkipTitle}</h3>
        {headSkipEntries.length === 0 ? (
          <p className="scope-note">{t.headSkipEmpty}</p>
        ) : (
          <ul className="block-log">
            {headSkipEntries.map((row) => (
              <li key={`hs-${row.domain}`}>
                <span className="kind">HEAD-skip</span>
                <span className="display">{row.domain}</span>
                <span className="meta" data-tick={headSkipClock}>
                  {row.until
                    ? `${t.headSkipUntil} ${new Date(row.until).toLocaleString(
                        localeIntl(locale)
                      )} · ${formatHeadSkipRelative(row.until, t)}`
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="text-button"
          disabled={headSkipEntries.length === 0}
          onClick={() => {
            void fetch("/api/head-skip/clear", { method: "POST" })
              .then(async (response) => {
                const data = (await response.json()) as {
                  ok?: boolean;
                  headSkipEntries?: Array<{ domain: string; until?: string }>;
                };
                if (!response.ok || !data.ok) {
                  setNotice(t.headSkipClearFail);
                  return;
                }
                setHeadSkipEntries(Array.isArray(data.headSkipEntries) ? data.headSkipEntries : []);
                setNotice(t.headSkipCleared);
              })
              .catch(() => setNotice(t.headSkipClearFail));
          }}
        >
          {t.headSkipClear}
        </button>
        {suggestion && (
          <>
            <CopyEnvLine
              locale={locale}
              envLine={`${PROBE_TIMEOUT_ENV_KEY}=${suggestion.suggestedMs}`}
            />
            <button
              type="button"
              className="text-button"
              onClick={() => {
                void fetch("/api/dev/probe-env", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ms: suggestion.suggestedMs })
                })
                  .then(async (response) => {
                    const data = (await response.json()) as {
                      ok?: boolean;
                      probeTimeoutMs?: number;
                    };
                    if (response.ok && data.ok) {
                      if (typeof data.probeTimeoutMs === "number") {
                        setProbeBudgetMs(data.probeTimeoutMs);
                        setProbeBudgetStatus("ok");
                      }
                      setNotice(t.intelWriteEnvOk);
                      return fetch("/api/health")
                        .then(async (healthRes) => {
                          const health = (await healthRes.json()) as {
                            ok?: boolean;
                            probeTimeoutMs?: number;
                            ownThreatMergePt?: boolean;
                          };
                          if (healthRes.ok) applyHealth(health);
                        })
                        .catch(() => undefined);
                    }
                    setNotice(t.intelWriteEnvFail);
                  })
                  .catch(() => setNotice(t.intelWriteEnvFail));
              }}
            >
              {t.intelWriteEnvLocal}
            </button>
          </>
        )}
      </section>

      <section className="settings-block" id="settings-privacy">
        <h2 id="settings-data-label">{t.privacyLabel}</h2>
        <label className="privacy">
          <span className="visually-hidden">{t.privacyLabel}</span>
          <select
            id="settings-data-select"
            value={mode}
            onChange={(e) => onPrivacyChange(e.target.value as PrivacyMode)}
            aria-label={t.privacyLabel}
          >
            <option value="off">{t.privacyOff}</option>
            <option value="local">{t.privacyLocal}</option>
            <option value="share">{t.privacyShare}</option>
          </select>
        </label>
        <p className="hint">{t.privacyNote}</p>
        <p className="hint">
          <a className="text-button" href={`/${locale}/privacy`} data-testid="settings-privacy-policy">
            {t.navPrivacy}
          </a>
        </p>
        {!persist && (
          <p className="scope-note" role="status">
            {isPortugueseLocale(locale)
              ? "Com «Nunca guardar», o histórico e os rascunhos de feedback não são guardados neste navegador."
              : "With Never store, check history and feedback drafts are not saved in this browser."}
          </p>
        )}
      </section>

      <section
        className="settings-block"
        id="settings-desktop"
        data-testid="settings-desktop-downloads"
        aria-labelledby="settings-desktop-heading"
      >
        {/* id must stay unique page-wide (assert-desktop-download-messages). */}
        <h2 id="settings-desktop-heading">{t.desktopDownloadsTitle}</h2>
        <p className="hint">{t.desktopDownloadsIntro}</p>
        <p className="hint" data-testid="settings-desktop-download-row">
          <a
            className="text-button"
            href={DESKTOP_WIN_URL || DESKTOP_PACKAGING_URL}
            target="_blank"
            rel="noreferrer"
          >
            {DESKTOP_WIN_URL ? t.desktopDownloadWindows : `${t.desktopDownloadWindows} — ${t.desktopDownloadSoon}`}
          </a>
          {" · "}
          <a
            className="text-button"
            href={macHref || DESKTOP_PACKAGING_URL}
            target="_blank"
            rel="noreferrer"
            data-testid="settings-desktop-download-mac"
            aria-describedby={macCdnDesc ? "settings-desktop-mac-cdn-desc" : undefined}
          >
            {macHref ? t.desktopDownloadMac : `${t.desktopDownloadMac} — ${t.desktopDownloadSoon}`}
          </a>
          {macCdnDesc ? (
            <span
              id="settings-desktop-mac-cdn-desc"
              data-testid="settings-desktop-mac-cdn-desc"
              className="visually-hidden"
            >
              {macCdnDesc}
            </span>
          ) : null}
          {macPromoteNote !== "none" ? (
            <span
              className="hint"
              data-testid={
                macPromoteNote === "ready-to-promote"
                  ? "settings-desktop-mac-ready-to-promote"
                  : "settings-desktop-mac-unsigned-note"
              }
              style={{ display: "block", marginTop: "0.35rem" }}
            >
              {macPromoteNote === "ready-to-promote"
                ? t.desktopDownloadReadyToPromote
                : t.desktopDownloadUnsignedUntilPromote}
            </span>
          ) : null}
          {" · "}
          <a
            className="text-button"
            href={DESKTOP_LINUX_URL || DESKTOP_PACKAGING_URL}
            target="_blank"
            rel="noreferrer"
          >
            {DESKTOP_LINUX_URL ? t.desktopDownloadLinux : `${t.desktopDownloadLinux} — ${t.desktopDownloadSoon}`}
          </a>
        </p>
        {DESKTOP_RELEASE_TAG ? (
          <p className="scope-note" data-testid="settings-desktop-release-tag">
            {t.desktopDownloadReleaseTag.replace("{tag}", DESKTOP_RELEASE_TAG)}
          </p>
        ) : null}
        {showMacSource ? (
          <p
            className="scope-note"
            data-testid="settings-desktop-mac-source"
            title={macCdnDesc || undefined}
          >
            {t.desktopDownloadMacSource.replace(
              "{source}",
              `${t.desktopDownloadSourceCdn} · ${t.desktopDownloadSourceGithub}`
            )}
          </p>
        ) : null}
        <p className="hint">
          <a
            className="text-button"
            href={DESKTOP_SETUP_GUIDE_URL}
            target="_blank"
            rel="noreferrer"
            data-testid="settings-desktop-setup-guide"
          >
            {t.desktopDownloadSetupGuide}
          </a>
          {" · "}
          <a className="text-button" href={DESKTOP_PACKAGING_URL} target="_blank" rel="noreferrer">
            {t.desktopDownloadPackaging}
          </a>
          {" · "}
          <a className="text-button" href={DESKTOP_RELEASE_URL} target="_blank" rel="noreferrer">
            {t.desktopDownloadRelease}
          </a>
          {" · "}
          <a className="text-button" href={DESKTOP_PACKAGING_URL} target="_blank" rel="noreferrer">
            {t.blockListsInstallDesktop}
          </a>
          {" · "}
          <a
            className="text-button"
            href={`/${locale}/privacy#privacy-honest-limits`}
            data-testid="settings-desktop-honest-limits"
            onClick={(e) => {
              if (!onOpenHonestLimits) return;
              e.preventDefault();
              onOpenHonestLimits();
            }}
          >
            {t.desktopHonestLimitsLink}
          </a>
        </p>
      </section>

      <section className="settings-block" id="settings-block-lists">
        <h2>{t.blocked}</h2>
        <p className="hint">
          <a className="text-button" href="#settings-block-lists">
            {t.trusted}
          </a>
        </p>
        <p className="scope-note">{t.blockListsWebsiteNote}</p>
        <p className="hint" data-testid="settings-lists-offline-path">
          {t.blockListsOfflinePath}{" "}
          <a className="text-button" href={`/${locale}/lists-offline`} data-testid="settings-lists-offline-link">
            {t.blockListsOfflinePageLink}
          </a>
        </p>
        <p className="hint">{t.blockOnSurfaces}</p>
        <p className="hint">{t.blockListsPrivacySurfaces}</p>
        <p
          className="hint settings-block-lists-live"
          data-testid="settings-block-lists-live"
        >
          <a className="text-button" href="#settings-block-lists">
            {t.blockListsLiveDeepLink}
          </a>
        </p>
        <p className="hint">
          <a
            className="text-button"
            href={CHROME_STORE_URL || STORE_DOCS_URL}
            target="_blank"
            rel="noreferrer"
          >
            {CHROME_STORE_URL ? t.blockListsGetChrome : t.blockListsChromeListingSoon}
          </a>
          {" · "}
          <a
            className="text-button"
            href={SAFARI_STORE_URL || STORE_DOCS_URL}
            target="_blank"
            rel="noreferrer"
          >
            {SAFARI_STORE_URL ? t.blockListsGetSafari : t.blockListsSafariListingSoon}
          </a>
          {" · "}
          <a
            className="text-button"
            href={EXT_SETUP_DOCS_URL}
            target="_blank"
            rel="noreferrer"
          >
            {t.blockListsInstallChromeSafari}
          </a>
        </p>
      </section>

      <section className="settings-block">
        <h2>{t.historyTitle}</h2>
        {history.length === 0 ? (
          <p className="scope-note">{t.none}</p>
        ) : (
          <>
            <label className="history-filter">
              <input
                type="checkbox"
                checked={historyTimeoutsOnly}
                onChange={(e) => {
                  setHistoryTimeoutsOnly(e.target.checked);
                  if (e.target.checked) {
                    setHistoryHeadSkippedOnly(false);
                    setHistoryProbeBlockedOnly(false);
                  }
                }}
              />
              <span>{t.historyFilterTimeouts}</span>
            </label>
            <label className="history-filter">
              <input
                type="checkbox"
                checked={historyHeadSkippedOnly}
                onChange={(e) => {
                  setHistoryHeadSkippedOnly(e.target.checked);
                  if (e.target.checked) {
                    setHistoryTimeoutsOnly(false);
                    setHistoryProbeBlockedOnly(false);
                  }
                }}
              />
              <span>{t.historyFilterHeadSkipped}</span>
            </label>
            <label className="history-filter" data-testid="history-filter-probe-blocked">
              <input
                type="checkbox"
                checked={historyProbeBlockedOnly}
                onChange={(e) => {
                  setHistoryProbeBlockedOnly(e.target.checked);
                  if (e.target.checked) {
                    setHistoryTimeoutsOnly(false);
                    setHistoryHeadSkippedOnly(false);
                  }
                }}
              />
              <span>{t.historyFilterProbeBlocked}</span>
            </label>
            {visibleHistory.length === 0 ? (
              <p className="scope-note" data-testid="history-filter-empty">
                {historyProbeBlockedOnly
                  ? t.historyFilterProbeBlockedEmpty
                  : historyHeadSkippedOnly
                    ? t.historyFilterHeadSkippedEmpty
                    : /* timeouts-only (or no chip) empty path keeps historyFilterEmpty */
                      t.historyFilterEmpty}
              </p>
            ) : (
              <ul className="block-log">
                {visibleHistory.slice(0, 12).map((entry) => (
                  <li key={`h-${entry.domain}-${entry.at}`}>
                    <span className={`kind ${entry.timedOut ? "is-timeout" : ""}`}>
                      {entry.timedOut ? t.historyTimedOut : entry.level}
                    </span>
                    <span className="display">{entry.domain}</span>
                    <span className="meta">
                      {t.historyProbe}{" "}
                      {entry.probeMs != null ? `${entry.probeMs}${t.timingMs}` : "—"}
                      {entry.probeTimeoutMs != null ? ` / ${entry.probeTimeoutMs}${t.timingMs}` : ""}
                      {entry.headSkipped ? ` · ${t.historyHeadSkipped}` : ""}
                      {entry.probeBlocked ? ` · probe-blocked` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="settings-subhead">{t.historyTimeoutHosts}</h3>
            {timeoutHosts.length === 0 ? (
              <p className="scope-note">{t.historyNoTimeouts}</p>
            ) : (
              <ul className="block-log">
                {timeoutHosts.map((row) => (
                  <li key={`to-${row.domain}`}>
                    <span className="kind is-timeout">
                      {row.timeouts}/{row.checks} {t.historyTimeoutCount}
                    </span>
                    <span className="display">{row.domain}</span>
                    <span className="meta">
                      max {row.maxProbeMs != null ? `${row.maxProbeMs}${t.timingMs}` : "—"} · last{" "}
                      {row.lastProbeMs != null ? `${row.lastProbeMs}${t.timingMs}` : "—"}
                      {row.probeBlocked > 0 ? ` · probe-blocked ${row.probeBlocked}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="scope-note">{t.historyTimeoutHostsNote}</p>

            <h3 className="settings-subhead">{t.historyHeadFailHosts}</h3>
            {headFailHosts.length === 0 ? (
              <p className="scope-note">{t.historyNoHeadFails}</p>
            ) : (
              <ul className="block-log">
                {headFailHosts.map((row) => (
                  <li key={`hf-${row.domain}`}>
                    <span className="kind">
                      {row.headFails}/{row.checks} {t.historyHeadFailCount}
                    </span>
                    <span className="display">{row.domain}</span>
                    <span className="meta">
                      max {row.maxProbeMs != null ? `${row.maxProbeMs}${t.timingMs}` : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="scope-note">{t.historyHeadFailHostsNote}</p>

            <fieldset className="history-csv-filter">
              <legend className="visually-hidden">{t.historyExportFullCsv}</legend>
              {(
                [
                  ["all", t.historyCsvFilterAll],
                  ["timedOut", t.historyCsvFilterTimeouts],
                  ["headFail", t.historyCsvFilterHeadFail],
                  ["headSkipped", t.historyCsvFilterHeadSkipped],
                  ["probeBlocked", t.historyCsvFilterProbeBlocked]
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={csvFlash === value ? "is-flash" : undefined}
                  onAnimationEnd={() => setCsvFlash(null)}
                >
                  <input
                    type="radio"
                    name="history-csv-filter"
                    checked={historyCsvFilter === value}
                    onChange={() => setHistoryCsvFilter(value)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
            <p className="scope-note" data-testid="history-export-csv-help">
              {t.historyExportCsvHelp}
            </p>
            <div className="action-row">
              <button
                type="button"
                className="text-button"
                disabled={timeoutHosts.length === 0}
                onClick={() => {
                  const result = downloadTimeoutSummaryCsv(history);
                  if (result.ok) setNotice(`${t.historyCsvExported}: ${result.filename}`);
                  else setNotice(t.historyNoTimeouts);
                }}
              >
                {t.historyExportCsv}
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  const result = downloadFullHistoryCsv(history, { filter: historyCsvFilter });
                  if (result.ok) setNotice(`${t.historyCsvExported}: ${result.filename}`);
                  else setNotice(t.historyCsvFilterEmpty);
                }}
              >
                {t.historyExportFullCsv}
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  clearCheckHistory();
                  setHistory([]);
                  setNotice(t.historyCleared);
                }}
              >
                {t.historyClear}
              </button>
            </div>
          </>
        )}
        <p className="scope-note">{t.historyNote}</p>
      </section>

      <section className="settings-block" id="settings-diagnostics">
        <h2>{t.diagnosticTitle}</h2>
        {diagnosticSummary.length === 0 ? (
          <p className="scope-note">{t.diagnosticEmpty}</p>
        ) : (
          <>
            <ul className="block-log">
              {diagnosticSummary.map((row) => (
                <li key={`d-${row.error}`}>
                  <span className="kind">
                    <code>{row.error}</code> {t.diagnosticCount}
                    {row.count}
                  </span>
                  <span className="display">{formatDiagnosticCode(row.error, t)}</span>
                  <span className="meta">
                    web
                    {row.error === "rate-limited-header-preferred" && row.lastDeltaSec != null
                      ? ` · Δ${row.lastDeltaSec}s`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                clearDiagnosticLog();
                setDiagnostics([]);
                setNotice(t.diagnosticCleared);
              }}
            >
              {t.diagnosticClear}
            </button>
          </>
        )}
        {lastHeaderPreferred ? (
          <p className="scope-note" data-testid="diagnostic-last-header-preferred">
            {t.diagnosticLastHeaderPreferred.replace(
              "{delta}",
              typeof lastHeaderPreferred.deltaSec === "number"
                ? String(lastHeaderPreferred.deltaSec)
                : "—"
            )}
          </p>
        ) : null}
        <p className="scope-note">{t.diagnosticNote}</p>
      </section>

      <section className="settings-block" id="settings-feedback-drafts" data-testid="settings-feedback-drafts">
        <h2>{t.feedbackDraftsTitle}</h2>
        {drafts.length > 0 ? (
          <p className="scope-note halt-accent" data-testid="feedback-drafts-after-report">
            {t.feedbackDraftsAfterReport}
          </p>
        ) : null}
        {drafts.length === 0 ? (
          <>
            <p className="scope-note">{t.feedbackEmpty}</p>
            {showAfterReportHint ? (
              <p
                className="scope-note halt-accent"
                data-testid="feedback-drafts-empty-after-report"
                role="status"
              >
                {t.feedbackDraftsAfterReport}{" "}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    clearReportDraftHint();
                    setShowAfterReportHint(false);
                  }}
                >
                  {t.feedbackDismissAfterReportHint}
                </button>
              </p>
            ) : null}
          </>
        ) : (
          <>
            <ul className="block-log">
              {drafts.map((entry) => (
                <li key={`f-${entry.mark}-${entry.domain}-${entry.at}`}>
                  <span className="kind">{entry.mark === "report" ? t.feedbackMarkReport : t.feedbackMarkFp}</span>
                  <span className="display">{entry.domain}</span>
                  <span className="meta">
                    {entry.level}{" "}
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        deleteFeedbackDraft(entry.domain, entry.mark);
                        setDrafts(listFeedbackDrafts());
                      }}
                    >
                      {t.remove}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <p className="feedback-export-plan" role="status">
              {exportPlanCopy}
            </p>
            <label className="feedback-field">
              <span>{t.feedbackReviewedBy}</span>
              <input
                type="text"
                value={exportReviewedBy}
                onChange={(e) => setExportReviewedBy(e.target.value)}
                placeholder={t.feedbackReviewedByPlaceholder}
                autoComplete="off"
              />
            </label>
            <label className="feedback-field">
              <span>{t.feedbackNotesPreview}</span>
              <textarea
                value={exportNotes}
                onChange={(e) => setExportNotes(e.target.value)}
                rows={4}
                spellCheck={false}
              />
            </label>
            <div className="feedback-checklist">
              <label>
                <input
                  type="checkbox"
                  checked={checklistHosts}
                  onChange={(e) => setChecklistHosts(e.target.checked)}
                />
                <span>{t.feedbackChecklistHosts}</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={checklistFp}
                  onChange={(e) => setChecklistFp(e.target.checked)}
                />
                <span>{t.feedbackChecklistFp}</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={checklistReady}
                  onChange={(e) => {
                    const next = e.target.checked;
                    if (next && !window.confirm(t.feedbackExportConfirm)) {
                      setChecklistReady(false);
                      return;
                    }
                    setChecklistReady(next);
                  }}
                />
                <span>{t.feedbackChecklistReady}</span>
              </label>
            </div>
            {!checklistReady && (
              <p className="scope-note" role="status">
                {t.feedbackExportNeedReady}
              </p>
            )}
            <div className="action-row">
              <button
                type="button"
                className="primary-button"
                disabled={!checklistReady}
                onClick={() => {
                  if (!checklistReady) return;
                  const result = exportFeedbackBatchDownload(drafts, {
                    reviewedBy: exportReviewedBy.trim(),
                    notes: exportNotes.trim() || undefined,
                    reviewChecklist: {
                      hostsReviewed: checklistHosts,
                      falsePositivesConfirmed: checklistFp,
                      readyToApply: checklistReady
                    }
                  });
                  if (result.ok) {
                    setNotice(
                      `${t.feedbackExported}: ${result.filename} · ${exportPlan.hostCount} host(s)`
                    );
                  }
                }}
              >
                {t.feedbackExport}
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  clearFeedbackDrafts();
                  setDrafts([]);
                  setNotice(t.feedbackCleared);
                }}
              >
                {t.feedbackClear}
              </button>
            </div>
          </>
        )}
        <p className="scope-note">{t.feedbackDraftsNote}</p>
      </section>

      <div className="action-row settings-actions">
        <button type="button" className="primary-button" onClick={onBack}>
          {t.back}
        </button>
        <button
          type="button"
          className="text-button"
          onClick={onReset}
          disabled={
            !persist &&
            history.length === 0 &&
            drafts.length === 0 &&
            diagnostics.length === 0
          }
        >
          {t.reset}
        </button>
      </div>
      {notice && (
        <p className="scope-note" role="status">
          {notice}
        </p>
      )}
    </main>
  );
}