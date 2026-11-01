/**
 * Popup controller — Ookla-style Scan UI
 * --------------------------------------
 * Talks to the background service worker for scan + prefs.
 * Optional first-party website POST /api/check (no third-party reputation).
 * Bilingual EN / European Portuguese via shared/i18n.js.
 */

import { t } from "../shared/i18n.js";
import { api } from "../shared/browser-api.js";
import { normalizePrivacyMode } from "../shared/log-client.js";
import { validateCheckTiming } from "../shared/validate-timing.js";
import {
  API_BASE_FALLBACK_NOTICE_KEY,
  shouldShowFallbackFromStorage
} from "../shared/api-base-fallback.mjs";
import {
  parseRetryAfterSec,
  resolveRetryAfterSec,
  retryAfterHeaderPreferred,
  retryAfterPreferenceDeltaSec
} from "../shared/retry-after.mjs";
import { DEFAULT_API_BASE, migrateLegacyApiBase } from "../shared/api-base-migrate.mjs";
import {
  TRACKERS_ANNOUNCE_CLEAR_MS,
  createTrackersAnnounceClearScheduler,
  nextTrackersAnnounceReadyAt,
  shouldAnnounceTrackersMute
} from "../shared/trackers-announce.mjs";
import {
  accountFetch,
  clearAccountTokens,
  persistAccountTokens,
  readAccountTokens
} from "../shared/account-sync.mjs";

const API_BASE_KEY = "websiteApiBase";
const TOAST_DISMISS_STORAGE_KEY = "shieldToastDismiss";

const els = {
  appTitle: document.getElementById("appTitle"),
  langLabel: document.getElementById("langLabel"),
  langSelect: document.getElementById("langSelect"),
  scanBtn: document.getElementById("scanBtn"),
  scanLabel: document.getElementById("scanLabel"),
  readout: document.getElementById("readout"),
  statusWord: document.getElementById("statusWord"),
  statusDetail: document.getElementById("statusDetail"),
  toastDismissToggle: document.getElementById("toastDismissToggle"),
  toastDismissLabel: document.getElementById("toastDismissLabel"),
  toastDismissHint: document.getElementById("toastDismissHint"),
  toastDismissStatus: document.getElementById("toastDismissStatus"),
  trackersLabel: document.getElementById("trackersLabel"),
  trackersCount: document.getElementById("trackersCount"),
  trackersApiAnnounce: document.getElementById("trackersApiAnnounce"),
  trackersMuteWindowChip: document.getElementById("trackersMuteWindowChip"),
  phishingLabel: document.getElementById("phishingLabel"),
  trackersValue: document.getElementById("trackersValue"),
  phishingValue: document.getElementById("phishingValue"),
  lastScanLabel: document.getElementById("lastScanLabel"),
  lastScanValue: document.getElementById("lastScanValue"),
  privacyLabel: document.getElementById("privacyLabel"),
  privacySelect: document.getElementById("privacySelect"),
  privacyHint: document.getElementById("privacyHint"),
  websiteApiToggle: document.getElementById("websiteApiToggle"),
  websiteApiLabel: document.getElementById("websiteApiLabel"),
  websiteApiHint: document.getElementById("websiteApiHint"),
  websiteApiFallback: document.getElementById("websiteApiFallback"),
  websiteApiStatus: document.getElementById("websiteApiStatus"),
  websiteApiBase: document.getElementById("websiteApiBase"),
  listsTitle: document.getElementById("listsTitle"),
  listsHint: document.getElementById("listsHint"),
  listDomain: document.getElementById("listDomain"),
  listBlockBtn: document.getElementById("listBlockBtn"),
  listTrustBtn: document.getElementById("listTrustBtn"),
  listBlockTabBtn: document.getElementById("listBlockTabBtn"),
  listsStatus: document.getElementById("listsStatus"),
  listsPasteDiag: document.getElementById("listsPasteDiag"),
  blockedTitle: document.getElementById("blockedTitle"),
  trustedTitle: document.getElementById("trustedTitle"),
  blockedList: document.getElementById("blockedList"),
  trustedList: document.getElementById("trustedList"),
  listsExportBtn: document.getElementById("listsExportBtn"),
  listsSupportBlobBtn: document.getElementById("listsSupportBlobBtn"),
  listsImportBtn: document.getElementById("listsImportBtn"),
  listsPasteQrBtn: document.getElementById("listsPasteQrBtn"),
  listsPasteFallback: document.getElementById("listsPasteFallback"),
  listsPasteFallbackArea: document.getElementById("listsPasteFallbackArea"),
  listsPasteFallbackApply: document.getElementById("listsPasteFallbackApply"),
  listsQrBtn: document.getElementById("listsQrBtn"),
  listsQrWrap: document.getElementById("listsQrWrap"),
  listsQrCanvas: document.getElementById("listsQrCanvas"),
  listsQrHint: document.getElementById("listsQrHint"),
  listsQrCopyBtn: document.getElementById("listsQrCopyBtn"),
  listsUndo: document.getElementById("listsUndo"),
  listsImportFile: document.getElementById("listsImportFile"),
  listsOfflineBackup: document.getElementById("listsOfflineBackup"),
  listAddForm: document.getElementById("listAddForm"),
  listCols: document.querySelector(".list-cols"),
  accountTitle: document.getElementById("accountTitle"),
  accountHint: document.getElementById("accountHint"),
  accountStatus: document.getElementById("accountStatus"),
  accountEmail: document.getElementById("accountEmail"),
  accountSendBtn: document.getElementById("accountSendBtn"),
  accountDeviceCode: document.getElementById("accountDeviceCode"),
  accountExchangeBtn: document.getElementById("accountExchangeBtn"),
  accountSyncToggle: document.getElementById("accountSyncToggle"),
  accountSyncLabel: document.getElementById("accountSyncLabel"),
  accountSyncNowBtn: document.getElementById("accountSyncNowBtn"),
  accountSignOutBtn: document.getElementById("accountSignOutBtn"),
  accountSignInForm: document.getElementById("accountSignInForm")
};

/** @type {{ domain: string, timer: ReturnType<typeof setTimeout> } | null} */
let undoBlockTab = null;
/** @type {string|null} */
let lastQrCompact = null;

function showFallbackNotice() {
  if (!els.websiteApiFallback) return;
  els.websiteApiFallback.hidden = false;
  els.websiteApiFallback.textContent = t(lang, "websiteApiBadBaseFallback");
}

function hideFallbackNotice() {
  if (!els.websiteApiFallback) return;
  els.websiteApiFallback.hidden = true;
  els.websiteApiFallback.textContent = "";
}

/** Restore Halt fallback notice from storage (e.g. after lang change / late DOM). */
async function restoreFallbackNoticeFromStorage() {
  try {
    const notice = await api.storage.local.get(API_BASE_FALLBACK_NOTICE_KEY);
    if (shouldShowFallbackFromStorage(notice)) showFallbackNotice();
  } catch {
    /* ignore */
  }
}

/** @type {'en'|'pt-PT'} */
let lang = "en";

function applyI18n() {
  els.appTitle.textContent = t(lang, "appTitle");
  els.langLabel.textContent = t(lang, "langLabel");
  els.scanLabel.textContent = t(lang, "scan");
  els.trackersLabel.textContent = t(lang, "trackersBlocked");
  els.phishingLabel.textContent = t(lang, "phishingHits");
  els.lastScanLabel.textContent = t(lang, "lastScan");
  if (els.privacyLabel) els.privacyLabel.textContent = t(lang, "privacyLabel");
  if (els.privacyHint) els.privacyHint.textContent = t(lang, "privacyHint");
  if (els.privacySelect) {
    els.privacySelect.options[0].textContent = t(lang, "privacyOff");
    els.privacySelect.options[1].textContent = t(lang, "privacyLocal");
    els.privacySelect.options[2].textContent = t(lang, "privacyShare");
  }
  if (els.toastDismissLabel) els.toastDismissLabel.textContent = t(lang, "toastDismissLabel");
  if (els.toastDismissHint) els.toastDismissHint.textContent = t(lang, "toastDismissHint");
  // Keep live status copy in the current language if a change was already announced.
  if (els.toastDismissStatus && !els.toastDismissStatus.hidden && els.toastDismissToggle) {
    els.toastDismissStatus.textContent = els.toastDismissToggle.checked
      ? t(lang, "toastDismissOn")
      : t(lang, "toastDismissOff");
  }
  if (els.websiteApiLabel) els.websiteApiLabel.textContent = t(lang, "websiteApiLabel");
  if (els.websiteApiHint) els.websiteApiHint.textContent = t(lang, "websiteApiHint");
  if (els.websiteApiBase) els.websiteApiBase.placeholder = t(lang, "websiteApiBasePlaceholder");
  // Keep fallback notice text in sync when language changes (do not hide).
  if (els.websiteApiFallback && !els.websiteApiFallback.hidden) {
    els.websiteApiFallback.textContent = t(lang, "websiteApiBadBaseFallback");
  }
  if (els.accountTitle) els.accountTitle.textContent = t(lang, "accountTitle");
  if (els.accountHint) els.accountHint.textContent = t(lang, "accountHint");
  if (els.accountEmail) els.accountEmail.placeholder = t(lang, "accountEmailPlaceholder");
  if (els.accountSendBtn) els.accountSendBtn.textContent = t(lang, "accountSendLink");
  if (els.accountDeviceCode) els.accountDeviceCode.placeholder = t(lang, "accountDevicePlaceholder");
  if (els.accountExchangeBtn) els.accountExchangeBtn.textContent = t(lang, "accountExchange");
  if (els.accountSyncLabel) els.accountSyncLabel.textContent = t(lang, "accountSyncToggle");
  if (els.accountSyncNowBtn) els.accountSyncNowBtn.textContent = t(lang, "accountSyncNow");
  if (els.accountSignOutBtn) els.accountSignOutBtn.textContent = t(lang, "accountSignOut");
  if (els.listsOfflineBackup) els.listsOfflineBackup.textContent = t(lang, "accountOfflineBackup");
  if (els.listsTitle) els.listsTitle.textContent = t(lang, "listsTitle");
  if (els.listsHint) els.listsHint.textContent = t(lang, "listsHint");
  if (els.listBlockBtn) els.listBlockBtn.textContent = t(lang, "listBlock");
  if (els.listTrustBtn) els.listTrustBtn.textContent = t(lang, "listTrust");
  if (els.listBlockTabBtn) els.listBlockTabBtn.textContent = t(lang, "listBlockTab");
  if (els.blockedTitle) els.blockedTitle.textContent = t(lang, "listsBlocked");
  if (els.trustedTitle) els.trustedTitle.textContent = t(lang, "listsTrusted");
  if (els.listsExportBtn) els.listsExportBtn.textContent = t(lang, "listsExport");
  if (els.listsSupportBlobBtn) els.listsSupportBlobBtn.textContent = t(lang, "listsSupportBlob");
  refreshSupportBlobBtnEnabled();
  if (els.listsImportBtn) els.listsImportBtn.textContent = t(lang, "listsImport");
  if (els.listsPasteQrBtn) els.listsPasteQrBtn.textContent = t(lang, "listsPasteQr");
  if (els.listsPasteFallbackApply) els.listsPasteFallbackApply.textContent = t(lang, "listsPasteFallbackApply");
  if (els.listsPasteFallbackArea) {
    els.listsPasteFallbackArea.placeholder = t(lang, "listsPasteFallbackPlaceholder");
  }
  if (els.listsQrBtn) els.listsQrBtn.textContent = t(lang, "listsQr");
  if (els.listsQrCopyBtn) els.listsQrCopyBtn.textContent = t(lang, "listsQrCopy");
  document.documentElement.lang = lang === "pt-PT" ? "pt-PT" : "en";
}

function flashBlockedColumn() {
  const cols = els.listCols;
  if (!cols) return;
  cols.classList.remove("is-flash");
  // reflow so animation restarts
  void cols.offsetWidth;
  cols.classList.add("is-flash");
  window.setTimeout(() => cols.classList.remove("is-flash"), 1300);
}

function showPasteFallback() {
  if (!els.listsPasteFallback) return;
  els.listsPasteFallback.hidden = false;
  els.listsPasteFallbackArea?.focus();
  setListsStatus(t(lang, "listsPasteFallbackHint"));
}

async function tryRequestClipboardRead() {
  try {
    if (!api.permissions?.request) return false;
    return Boolean(await api.permissions.request({ permissions: ["clipboardRead"] }));
  } catch {
    return false;
  }
}

async function readClipboardText() {
  try {
    return (await navigator.clipboard.readText()).trim();
  } catch {
    const granted = await tryRequestClipboardRead();
    if (!granted) return null;
    try {
      return (await navigator.clipboard.readText()).trim();
    } catch {
      return null;
    }
  }
}

const LISTS_LAST_PASTE_AT_KEY = "shieldListsLastPasteAt";

async function rememberPasteSuccess() {
  try {
    await api.storage.local.set({ [LISTS_LAST_PASTE_AT_KEY]: new Date().toISOString() });
  } catch {
    /* diagnostics only — ignore */
  }
  await refreshPasteDiag();
}

/** Disable Support diagnostics JSON unless Data = Diagnostics (aria-disabled keeps focus). */
function refreshSupportBlobBtnEnabled() {
  if (!els.listsSupportBlobBtn) return;
  const ok = normalizePrivacyMode(els.privacySelect?.value) === "share";
  els.listsSupportBlobBtn.disabled = false;
  els.listsSupportBlobBtn.setAttribute("aria-disabled", ok ? "false" : "true");
  els.listsSupportBlobBtn.title = ok ? "" : t(lang, "listsSupportNeedDiag");
  els.listsSupportBlobBtn.tabIndex = 0;
  // Point keyboard users at the live region when Diagnostics is required.
  if (ok) els.listsSupportBlobBtn.removeAttribute("aria-describedby");
  else if (els.listsStatus) els.listsSupportBlobBtn.setAttribute("aria-describedby", "listsStatus");
  if (!ok) updateMuteWindowChip(false);
}

/**
 * Share mode only: chip when support blob reports trackersApiAnnounceActive.
 * Auto-clears via createTrackersAnnounceClearScheduler (no second support-blob copy needed).
 */
function updateMuteWindowChip(active) {
  if (!els.trackersMuteWindowChip) return;
  const share = normalizePrivacyMode(els.privacySelect?.value) === "share";
  if (share && active) {
    els.trackersMuteWindowChip.hidden = false;
    els.trackersMuteWindowChip.textContent = t(lang, "trackersMuteWindowChip");
    clearTrackersApiAnnounceSoon();
  } else {
    els.trackersMuteWindowChip.hidden = true;
    els.trackersMuteWindowChip.textContent = "";
  }
}

/** Announce via #listsStatus (role=status aria-live) when Diagnostics mode is required. */
function announceSupportNeedDiagIfDisabled() {
  if (!els.listsSupportBlobBtn) return;
  if (els.listsSupportBlobBtn.getAttribute("aria-disabled") === "true") {
    setListsStatus(t(lang, "listsSupportNeedDiag"));
  }
}

/** Diagnostics mode only: ISO paste timestamp, never the payload. */
async function refreshPasteDiag() {
  if (!els.listsPasteDiag) return;
  const mode = normalizePrivacyMode(els.privacySelect?.value);
  if (mode !== "share") {
    els.listsPasteDiag.hidden = true;
    els.listsPasteDiag.textContent = "";
    return;
  }
  try {
    const stored = await api.storage.local.get(LISTS_LAST_PASTE_AT_KEY);
    const at = stored?.[LISTS_LAST_PASTE_AT_KEY];
    if (!at || typeof at !== "string") {
      els.listsPasteDiag.hidden = true;
      els.listsPasteDiag.textContent = "";
      return;
    }
    let display = at;
    try {
      display = new Date(at).toLocaleString(lang === "pt-PT" ? "pt-PT" : "en-GB");
    } catch {
      /* keep ISO */
    }
    els.listsPasteDiag.hidden = false;
    els.listsPasteDiag.textContent = t(lang, "listsPasteDiag", { at: display });
  } catch {
    els.listsPasteDiag.hidden = true;
  }
}

async function importBackupPayload(backup, opts = {}) {
  const res = await api.runtime.sendMessage({ type: "SHIELD_LISTS_IMPORT", backup });
  if (res?.ok) {
    renderLists(res.lists);
    updateQrWrapVisibility(res.lists);
    if (opts.flash) {
      flashBlockedColumn();
      await rememberPasteSuccess();
    }
    if (els.listsPasteFallback) els.listsPasteFallback.hidden = true;
    const over =
      globalThis.ShieldQr && !globalThis.ShieldQr.listsFitQrCanvas?.(res.lists);
    if (over) {
      setListsStatus(
        `${t(lang, "listsImported")} ${t(lang, "listsQrTooBig", {
          limit: globalThis.ShieldQr?.QR_HOST_LIMIT || 40
        })}`
      );
    } else {
      setListsStatus(t(lang, "listsImported"));
    }
    if (res.dnr?.truncated) noteDnr(res);
  } else {
    setListsStatus(res?.error || t(lang, "listsImportFail"));
  }
  return res;
}

function setListsStatus(msg) {
  if (!els.listsStatus) return;
  els.listsStatus.hidden = !msg;
  els.listsStatus.textContent = msg || "";
}

function noteDnr(res) {
  if (res?.dnr?.truncated) {
    setListsStatus(t(lang, "listsDnrTruncated", { limit: res.dnr.limit || 500, total: res.dnr.total }));
  }
}

function renderMiniList(ul, entries, emptyLabel) {
  if (!ul) return;
  ul.innerHTML = "";
  if (!entries?.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = emptyLabel;
    ul.appendChild(li);
    return;
  }
  for (const entry of entries) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = entry.domain;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "text-button";
    btn.textContent = t(lang, "listsRemove");
    btn.addEventListener("click", () => {
      void api.runtime
        .sendMessage({ type: "SHIELD_LISTS_REMOVE", domain: entry.domain })
        .then((res) => {
          if (res?.ok) {
            renderLists(res.lists);
            updateQrWrapVisibility(res.lists);
            if (res.dnr?.truncated) noteDnr(res);
            else setListsStatus(t(lang, "listsSaved"));
          }
        });
    });
    li.append(span, btn);
    ul.appendChild(li);
  }
}

function renderLists(lists) {
  renderMiniList(els.blockedList, lists?.blocked, t(lang, "listsEmpty"));
  renderMiniList(els.trustedList, lists?.trusted, t(lang, "listsEmpty"));
}

async function refreshLists() {
  const res = await api.runtime.sendMessage({ type: "SHIELD_LISTS_GET" });
  if (res?.ok) renderLists(res.lists);
}

function apiBase() {
  const raw = (els.websiteApiBase?.value || DEFAULT_API_BASE).trim().replace(/\/$/, "");
  return raw || DEFAULT_API_BASE;
}

/** Reject non-http(s) bases and paths before save (production or local). */
function isValidApiBase(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (!u.hostname) return false;
    if (u.pathname && u.pathname !== "/") return false;
    if (u.search || u.hash) return false;
    return true;
  } catch {
    return false;
  }
}

async function persistApiBase() {
  const base = apiBase();
  if (!isValidApiBase(base)) return false;
  try {
    await api.storage.local.set({ [API_BASE_KEY]: base });
    return true;
  } catch {
    return false;
  }
}

function isLocalApiHost(hostname) {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "[::1]";
}

/** Request optional_host_permissions for non-localhost production API bases. */
async function ensureApiHostPermission(base) {
  let originPattern;
  try {
    const u = new URL(base);
    if (isLocalApiHost(u.hostname)) return true;
    originPattern = `${u.protocol}//${u.host}/*`;
  } catch {
    return false;
  }
  if (!api.permissions?.request) return true;
  try {
    const already = await api.permissions.contains({ origins: [originPattern] });
    if (already) return true;
    return Boolean(await api.permissions.request({ origins: [originPattern] }));
  } catch {
    return false;
  }
}

/** Map website risk.level into popup readout levels. */
function riskLevelToReadout(level) {
  if (level === "CRITICAL" || level === "HIGH") return "danger";
  if (level === "CAUTION" || level === "UNKNOWN") return "caution";
  if (level === "LOW_EVIDENCE") return "safe";
  return "idle";
}

function applyApiRiskToReadout(riskLevel) {
  const level = riskLevelToReadout(riskLevel);
  setReadout(level);
  // Popup level is from POST /api/check — do not imply local tracker counts.
  els.statusDetail.textContent = t(lang, "detailFromApiCheck");
}

/**
 * Real first-party POST /api/check when toggle is on.
 * Validates analysis.timing against the shared schema; merges risk into main readout.
 */
async function runWebsiteApiCheck() {
  if (!els.websiteApiToggle || !els.websiteApiStatus) return;
  if (!els.websiteApiToggle.checked) {
    els.websiteApiStatus.hidden = true;
    els.websiteApiStatus.textContent = "";
    return;
  }

  els.websiteApiStatus.hidden = false;
  els.websiteApiStatus.textContent = t(lang, "websiteApiChecking");

  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    const pageUrl = tab?.url || "";
    if (!/^https?:\/\//i.test(pageUrl)) {
      els.websiteApiStatus.textContent = t(lang, "websiteApiNeedHttp");
      return;
    }

    let base = apiBase();
    let fellBack = false;
    if (!isValidApiBase(base)) {
      if (els.websiteApiBase) els.websiteApiBase.value = DEFAULT_API_BASE;
      base = DEFAULT_API_BASE;
      fellBack = true;
    }
    let saved = await persistApiBase();
    if (!saved) {
      // Auto-retry once against default localhost without a second click.
      if (els.websiteApiBase) els.websiteApiBase.value = DEFAULT_API_BASE;
      base = DEFAULT_API_BASE;
      fellBack = true;
      saved = await persistApiBase();
      if (!saved) {
        showFallbackNotice();
        return;
      }
    }
    if (fellBack) {
      try {
        await api.storage.local.set({ [API_BASE_FALLBACK_NOTICE_KEY]: true });
      } catch {
        /* ignore */
      }
      showFallbackNotice();
    }
    const allowed = await ensureApiHostPermission(base);
    if (!allowed) {
      els.websiteApiStatus.textContent = t(lang, "websiteApiNeedPermission");
      return;
    }

    // Read-only hint — website never stores personal lists.
    let personalListBlocked = false;
    try {
      const hostRes = await api.runtime.sendMessage({
        type: "SHIELD_LISTS_HOST_BLOCKED",
        url: pageUrl
      });
      personalListBlocked = Boolean(hostRes?.ok && hostRes.blocked);
    } catch {
      /* ignore */
    }

    const response = await fetch(`${base}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: pageUrl,
        ...(personalListBlocked ? { personalListBlocked: true } : {})
      })
    });
    let data = {};
    try {
      data = await response.json();
    } catch {
      /* JSON may be empty; 429 still uses Retry-After header */
    }
    if (response.status === 429) {
      const headerSec = parseRetryAfterSec(response.headers.get("Retry-After"), -1);
      const preferred = retryAfterHeaderPreferred(headerSec, data.retryAfterSec);
      const sec = resolveRetryAfterSec(headerSec, data.retryAfterSec, 60);
      const codes = preferred
        ? ["rate-limited-header-preferred", "rate-limited"]
        : ["rate-limited"];
      if (preferred) {
        const deltaSec = retryAfterPreferenceDeltaSec(headerSec, data.retryAfterSec);
        try {
          const prev = (await api.storage.local.get("shieldDiagnosticLog")).shieldDiagnosticLog;
          const list = Array.isArray(prev) ? prev : [];
          const entry = {
            at: new Date().toISOString(),
            error: "rate-limited-header-preferred",
            source: "extension",
            ...(typeof deltaSec === "number" ? { deltaSec } : {})
          };
          await api.storage.local.set({
            shieldDiagnosticLog: [entry, ...list].slice(0, 100)
          });
        } catch {
          /* ignore */
        }
      }
      els.websiteApiStatus.textContent = t(lang, "websiteApiFail", {
        error: `${codes.join(" → ")} (${sec}s)`
      });
      return;
    }
    if (!response.ok || !data?.ok || !data?.analysis) {
      els.websiteApiStatus.textContent = t(lang, "websiteApiFail", {
        error: data?.error || `HTTP ${response.status}`
      });
      return;
    }

    const timingCheck = validateCheckTiming(data.analysis.timing);
    if (!timingCheck.ok) {
      els.websiteApiStatus.textContent = t(lang, "websiteApiSchemaFail", {
        errors: timingCheck.errors.join("; ")
      });
      return;
    }

    const level = data.analysis.risk?.level || "?";
    const total = data.analysis.timing?.totalMs;
    const domain = data.analysis.parsed?.registrableDomain || "";
    const hasUserBlock = Boolean(
      data.analysis.personalListBlocked ||
        (Array.isArray(data.analysis.risk?.evidence) &&
          data.analysis.risk.evidence.some((e) => e?.id === "user-block"))
    );
    applyApiRiskToReadout(level);
    const stateRes = await api.runtime.sendMessage({
      type: "SHIELD_RECORD_API_SCAN",
      riskLevel: level,
      domain
    });
    if (stateRes?.ok) {
      renderScan(stateRes.result || stateRes.state?.lastScan, stateRes.state?.lastScanAt);
    }
    const okLine = t(lang, "websiteApiOk", {
      level,
      total: total == null ? "—" : String(total)
    });
    els.websiteApiStatus.textContent = hasUserBlock
      ? `${okLine} · ${t(lang, "websiteApiUserBlock")}`
      : okLine;
    scheduleAccountAutoPull(base);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unreachable";
    els.websiteApiStatus.textContent = t(lang, "websiteApiFail", { error: message });
  }
}

/** Debounced cloud pull after a successful Website API scan when Sync lists is on. */
let accountAutoPullTimer = null;
const ACCOUNT_AUTO_PULL_MS = 2500;

function scheduleAccountAutoPull(base) {
  if (accountAutoPullTimer) clearTimeout(accountAutoPullTimer);
  accountAutoPullTimer = setTimeout(() => {
    accountAutoPullTimer = null;
    void maybeAccountAutoPull(base);
  }, ACCOUNT_AUTO_PULL_MS);
}

async function maybeAccountAutoPull(base) {
  const mode = normalizePrivacyMode(els.privacySelect?.value);
  if (mode === "off") return;
  const tokens = await readAccountTokens(api.storage.local);
  if (!tokens.accessToken || !tokens.syncEnabled) return;
  try {
    let access = tokens.accessToken;
    let get = await accountFetch(base, "/api/sync/lists", {
      method: "GET",
      token: access
    });
    if (get.status === 401 && tokens.refreshToken) {
      const refreshed = await accountFetch(base, "/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: tokens.refreshToken })
      });
      const refData = await refreshed.json();
      if (refreshed.ok && refData.ok && refData.accessToken) {
        await persistAccountTokens(
          {
            accessToken: refData.accessToken,
            refreshToken: refData.refreshToken || tokens.refreshToken
          },
          api.storage.local
        );
        access = refData.accessToken;
        get = await accountFetch(base, "/api/sync/lists", {
          method: "GET",
          token: access
        });
      }
    }
    const data = await get.json();
    if (!get.ok || !data.ok || !data.backup) return;
    await importBackupPayload(data.backup);
    setAccountStatus(t(lang, "accountSyncOk"));
  } catch {
    /* ignore offline / sync errors on auto-pull */
  }
}

function wordFor(level) {
  if (level === "danger") return t(lang, "statusDanger");
  if (level === "caution") return t(lang, "statusCaution");
  if (level === "safe") return t(lang, "statusSafe");
  return t(lang, "statusStandby");
}

function setReadout(level) {
  els.readout.dataset.level = level || "idle";
  els.statusWord.textContent = wordFor(level || "idle");
}

/** @type {boolean} */
let trackersWereApiMuted = false;
/** Earliest time a Website-API mute may re-announce (after TRACKERS_ANNOUNCE_CLEAR_MS). */
let trackersAnnounceReadyAt = 0;
const trackersAnnounceClear = createTrackersAnnounceClearScheduler({
  clearMs: TRACKERS_ANNOUNCE_CLEAR_MS
});

/** Clear aria-live mute text + mute-window chip after TRACKERS_ANNOUNCE_CLEAR_MS (one scheduler). */
function clearTrackersApiAnnounceSoon() {
  trackersAnnounceClear.schedule(() => {
    if (els.trackersApiAnnounce) els.trackersApiAnnounce.textContent = "";
    trackersAnnounceReadyAt = Date.now();
    updateMuteWindowChip(false);
  });
}

/**
 * @param {object} lastScan
 * @param {string|null} lastScanAt
 */
function renderScan(lastScan, lastScanAt) {
  const level = lastScan?.level || "idle";
  const fromApi = lastScan?.source === "website-api";
  setReadout(level);

  // Website API: mute Trackers digit entirely (level is from /api/check, not local count).
  const phishing = lastScan?.phishingHits ?? 0;
  if (els.trackersCount) {
    els.trackersCount.classList.toggle("is-api-muted", fromApi);
  }
  if (els.trackersValue) {
    els.trackersValue.textContent = fromApi ? "—" : String(lastScan?.trackersBlocked ?? 0);
    if (fromApi) els.trackersValue.title = t(lang, "detailFromApiCheck");
    else els.trackersValue.removeAttribute("title");
  }
  if (els.trackersApiAnnounce) {
    if (fromApi) {
      // SW gates via noteWebsiteApiTrackersMute → lastScan.trackersMutedAnnounced; popup mirrors.
      const swAllows = lastScan?.trackersMutedAnnounced !== false;
      const now = Date.now();
      if (swAllows && shouldAnnounceTrackersMute(now, trackersAnnounceReadyAt)) {
        els.trackersApiAnnounce.textContent = t(lang, "trackersMutedAnnounce");
        trackersAnnounceReadyAt = nextTrackersAnnounceReadyAt(now, TRACKERS_ANNOUNCE_CLEAR_MS);
        clearTrackersApiAnnounceSoon();
      }
      // Share only: mute chip from lastScan.trackersApiAnnounceActive (no support-blob click required).
      updateMuteWindowChip(lastScan?.trackersApiAnnounceActive === true);
    } else if (trackersWereApiMuted) {
      trackersAnnounceClear.cancel();
      trackersAnnounceReadyAt = 0;
      els.trackersApiAnnounce.textContent = "";
      updateMuteWindowChip(false);
    }
  }
  trackersWereApiMuted = fromApi;
  els.phishingValue.textContent = String(phishing);

  if (!lastScan || level === "idle") {
    els.statusDetail.textContent = t(lang, "statusIdle");
  } else if (fromApi) {
    els.statusDetail.textContent = t(lang, "detailFromApiCheck");
  } else if (level === "danger") {
    els.statusDetail.textContent = t(lang, "detailDanger");
  } else if (level === "caution") {
    els.statusDetail.textContent = t(lang, "detailCaution");
  } else {
    els.statusDetail.textContent = t(lang, "detailSafe");
  }

  if (lastScanAt) {
    try {
      els.lastScanValue.textContent = new Date(lastScanAt).toLocaleString(
        lang === "pt-PT" ? "pt-PT" : "en-GB"
      );
    } catch {
      els.lastScanValue.textContent = lastScanAt;
    }
  } else {
    els.lastScanValue.textContent = t(lang, "never");
  }
}

async function refreshFromBackground() {
  const res = await api.runtime.sendMessage({ type: "SHIELD_GET_STATE" });
  if (!res?.ok) return;
  lang = res.state.lang === "pt-PT" ? "pt-PT" : "en";
  els.langSelect.value = lang;
  if (els.privacySelect) {
    els.privacySelect.value = normalizePrivacyMode(res.state.privacyMode);
  }
  try {
    const dismissStore = await api.storage.local.get(TOAST_DISMISS_STORAGE_KEY);
    if (els.toastDismissToggle) {
      els.toastDismissToggle.checked = dismissStore?.[TOAST_DISMISS_STORAGE_KEY] === true;
    }
  } catch {
    if (els.toastDismissToggle) els.toastDismissToggle.checked = false;
  }
  try {
    const stored = await api.storage.local.get(API_BASE_KEY);
    if (els.websiteApiBase && stored?.[API_BASE_KEY]) {
      const migrated = migrateLegacyApiBase(String(stored[API_BASE_KEY]));
      if (migrated !== String(stored[API_BASE_KEY]).trim().replace(/\/$/, "")) {
        await api.storage.local.set({ [API_BASE_KEY]: migrated });
      }
      if (isValidApiBase(migrated)) els.websiteApiBase.value = migrated;
      else {
        els.websiteApiBase.value = DEFAULT_API_BASE;
        await api.storage.local.set({ [API_BASE_KEY]: DEFAULT_API_BASE });
      }
    } else if (els.websiteApiBase && !els.websiteApiBase.value) {
      els.websiteApiBase.value = DEFAULT_API_BASE;
    }
  } catch {
    if (els.websiteApiBase && !els.websiteApiBase.value) els.websiteApiBase.value = DEFAULT_API_BASE;
  }
  applyI18n();
  await refreshPasteDiag();
  refreshSupportBlobBtnEnabled();
  renderScan(res.state.lastScan, res.state.lastScanAt);
  // Restore website-API readout when last scan came from POST /api/check.
  if (res.state.lastScan?.source === "website-api") {
    setReadout(res.state.lastScan.level || "idle");
    if (els.websiteApiToggle) els.websiteApiToggle.checked = true;
  }
  await restoreFallbackNoticeFromStorage();
  await refreshLists();
  await refreshAccountUi();
}

function setAccountStatus(msg) {
  if (!els.accountStatus) return;
  els.accountStatus.textContent = msg || "";
}

async function refreshAccountUi() {
  const tokens = await readAccountTokens(api.storage.local);
  if (els.accountSyncToggle) els.accountSyncToggle.checked = tokens.syncEnabled;
  if (tokens.email && tokens.accessToken) {
    setAccountStatus(t(lang, "accountSignedIn", { email: tokens.email }));
  } else {
    setAccountStatus(t(lang, "accountSignedOut"));
  }
}

async function accountApiBase() {
  return apiBase() || DEFAULT_API_BASE;
}

els.accountSignInForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const mode = normalizePrivacyMode(els.privacySelect?.value);
  if (mode === "off") {
    setAccountStatus(t(lang, "accountNeedPrivacy"));
    return;
  }
  const email = (els.accountEmail?.value || "").trim();
  if (!email) return;
  try {
    const base = await accountApiBase();
    const res = await accountFetch(base, "/api/auth/magic/request", {
      method: "POST",
      body: JSON.stringify({ email, client: "extension" })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setAccountStatus(
        data.error === "account-sync-disabled"
          ? t(lang, "accountDisabled")
          : t(lang, "accountSyncFail", { error: data.error || String(res.status) })
      );
      return;
    }
    setAccountStatus(t(lang, "accountMagicSent"));
    if (data.devLink && els.accountDeviceCode) {
      // Dev: open consume URL; popup may not follow redirect — user pastes deviceCode.
      try {
        await api.tabs.create({ url: data.devLink });
      } catch {
        /* ignore */
      }
    }
  } catch (err) {
    setAccountStatus(t(lang, "accountSyncFail", { error: err instanceof Error ? err.message : "fail" }));
  }
});

els.accountExchangeBtn?.addEventListener("click", async () => {
  const mode = normalizePrivacyMode(els.privacySelect?.value);
  if (mode === "off") {
    setAccountStatus(t(lang, "accountNeedPrivacy"));
    return;
  }
  const deviceCode = (els.accountDeviceCode?.value || "").trim();
  if (!deviceCode) return;
  try {
    const base = await accountApiBase();
    const res = await accountFetch(base, "/api/auth/device/exchange", {
      method: "POST",
      body: JSON.stringify({ deviceCode })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setAccountStatus(t(lang, "accountSyncFail", { error: data.error || String(res.status) }));
      return;
    }
    await persistAccountTokens(
      {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        email: (els.accountEmail?.value || "").trim() || "signed-in",
        syncEnabled: els.accountSyncToggle?.checked === true
      },
      api.storage.local
    );
    await refreshAccountUi();
  } catch (err) {
    setAccountStatus(t(lang, "accountSyncFail", { error: err instanceof Error ? err.message : "fail" }));
  }
});

els.accountSyncToggle?.addEventListener("change", async () => {
  const on = els.accountSyncToggle?.checked === true;
  await persistAccountTokens({ syncEnabled: on }, api.storage.local);
});

els.accountSignOutBtn?.addEventListener("click", async () => {
  const tokens = await readAccountTokens(api.storage.local);
  try {
    if (tokens.accessToken) {
      const base = await accountApiBase();
      await accountFetch(base, "/api/auth/logout", {
        method: "POST",
        token: tokens.accessToken
      });
    }
  } catch {
    /* ignore */
  }
  await clearAccountTokens(api.storage.local);
  await refreshAccountUi();
});

els.accountSyncNowBtn?.addEventListener("click", async () => {
  const mode = normalizePrivacyMode(els.privacySelect?.value);
  if (mode === "off") {
    setAccountStatus(t(lang, "accountNeedPrivacy"));
    return;
  }
  const tokens = await readAccountTokens(api.storage.local);
  if (!tokens.accessToken) {
    setAccountStatus(t(lang, "accountSignedOut"));
    return;
  }
  if (!tokens.syncEnabled) {
    setAccountStatus(t(lang, "accountSyncToggle"));
    return;
  }
  try {
    const base = await accountApiBase();
    const exportRes = await api.runtime.sendMessage({ type: "SHIELD_LISTS_EXPORT" });
    if (!exportRes?.ok || !exportRes.backup) {
      setAccountStatus(t(lang, "accountSyncFail", { error: "no-local-lists" }));
      return;
    }
    const put = await accountFetch(base, "/api/sync/lists", {
      method: "PUT",
      token: tokens.accessToken,
      body: JSON.stringify({
        backup: exportRes.backup,
        client: "extension",
        baseUpdatedAt: exportRes.backup?.updatedAt
      })
    });
    const putData = await put.json();
    if (!put.ok || !putData.ok) {
      setAccountStatus(t(lang, "accountSyncFail", { error: putData.error || String(put.status) }));
      return;
    }
    if (putData.backup) {
      await importBackupPayload(putData.backup);
    }
    setAccountStatus(putData.merged ? t(lang, "accountSyncMerged") : t(lang, "accountSyncOk"));
  } catch (err) {
    setAccountStatus(t(lang, "accountSyncFail", { error: err instanceof Error ? err.message : "fail" }));
  }
});

async function runScan() {
  els.scanBtn.classList.add("is-scanning");
  els.scanLabel.textContent = t(lang, "scanning");

  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      els.statusDetail.textContent = t(lang, "statusIdle");
      return;
    }

    const res = await api.runtime.sendMessage({
      type: "SHIELD_SCAN",
      tabId: tab.id,
      url: tab.url || ""
    });

    if (res?.ok) {
      const stateRes = await api.runtime.sendMessage({ type: "SHIELD_GET_STATE" });
      renderScan(res.result, stateRes?.state?.lastScanAt || new Date().toISOString());
    }

    if (els.websiteApiToggle?.checked) {
      await runWebsiteApiCheck();
    }
  } finally {
    els.scanBtn.classList.remove("is-scanning");
    els.scanLabel.textContent = t(lang, "scan");
  }
}

els.scanBtn.addEventListener("click", () => {
  runScan().catch((err) => {
    console.debug("[shield popup] scan failed", err);
    els.scanBtn.classList.remove("is-scanning");
    els.scanLabel.textContent = t(lang, "scan");
  });
});

els.langSelect.addEventListener("change", async () => {
  lang = els.langSelect.value === "pt-PT" ? "pt-PT" : "en";
  applyI18n();
  // Storage flag may have been set before DOM was ready — restore after i18n.
  await restoreFallbackNoticeFromStorage();
  await api.runtime.sendMessage({ type: "SHIELD_SET_PREFS", lang });
  const res = await api.runtime.sendMessage({ type: "SHIELD_GET_STATE" });
  if (res?.ok) renderScan(res.state.lastScan, res.state.lastScanAt);
});

function announceToastDismiss(on) {
  if (!els.toastDismissStatus) return;
  els.toastDismissStatus.hidden = false;
  els.toastDismissStatus.textContent = on ? t(lang, "toastDismissOn") : t(lang, "toastDismissOff");
}

els.toastDismissToggle?.addEventListener("change", async () => {
  const on = Boolean(els.toastDismissToggle.checked);
  try {
    await api.storage.local.set({ [TOAST_DISMISS_STORAGE_KEY]: on });
    announceToastDismiss(on);
  } catch {
    els.toastDismissToggle.checked = false;
    announceToastDismiss(false);
  }
});

els.privacySelect?.addEventListener("change", async () => {
  const privacyMode = normalizePrivacyMode(els.privacySelect.value);
  els.privacySelect.value = privacyMode;
  await api.runtime.sendMessage({ type: "SHIELD_SET_PREFS", privacyMode });
  if (privacyMode === "off") {
    try {
      await api.storage.local.remove(LISTS_LAST_PASTE_AT_KEY);
    } catch {
      /* ignore */
    }
  }
  await refreshLists();
  await refreshPasteDiag();
  refreshSupportBlobBtnEnabled();
  if (privacyMode !== "share") updateMuteWindowChip(false);
  if (privacyMode === "off") setListsStatus(t(lang, "listsNeedLocal"));
  else if (privacyMode !== "share") announceSupportNeedDiagIfDisabled();
  else setListsStatus(""); // clear live region when Diagnostics is selected again
});

els.listAddForm?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const domain = (els.listDomain?.value || "").trim();
  if (!domain) return;
  if (normalizePrivacyMode(els.privacySelect?.value) === "off") {
    setListsStatus(t(lang, "listsNeedLocal"));
    return;
  }
  const res = await api.runtime.sendMessage({
    type: "SHIELD_LISTS_ADD_BLOCK",
    domain,
    reason: "user"
  });
  if (res?.ok) {
    if (els.listDomain) els.listDomain.value = "";
    renderLists(res.lists);
    updateQrWrapVisibility(res.lists);
    if (res.dnr?.truncated) noteDnr(res);
    else setListsStatus(t(lang, "listsSaved"));
    showUndoBlockTab(domain);
  } else {
    setListsStatus(res?.error || t(lang, "listsNeedLocal"));
  }
});

els.listTrustBtn?.addEventListener("click", async () => {
  const domain = (els.listDomain?.value || "").trim();
  if (!domain) return;
  if (normalizePrivacyMode(els.privacySelect?.value) === "off") {
    setListsStatus(t(lang, "listsNeedLocal"));
    return;
  }
  const res = await api.runtime.sendMessage({ type: "SHIELD_LISTS_ADD_TRUST", domain });
  if (res?.ok) {
    if (els.listDomain) els.listDomain.value = "";
    renderLists(res.lists);
    if (res.dnr?.truncated) noteDnr(res);
    else setListsStatus(t(lang, "listsSaved"));
  }
});

function updateQrWrapVisibility(lists) {
  if (!els.listsQrWrap) return;
  const canDraw = globalThis.ShieldQr?.listsFitQrCanvas?.(lists);
  if (!canDraw) {
    els.listsQrWrap.hidden = true;
    return;
  }
  // Under 40 again after remove — re-show if a QR was already drawn.
  if (lastQrCompact) els.listsQrWrap.hidden = false;
}

function clearUndoBlockTab() {
  if (undoBlockTab?.timer) clearTimeout(undoBlockTab.timer);
  undoBlockTab = null;
  if (els.listsUndo) {
    els.listsUndo.hidden = true;
    els.listsUndo.textContent = "";
  }
}

function showUndoBlockTab(domain) {
  clearUndoBlockTab();
  if (!els.listsUndo || !domain) return;
  els.listsUndo.hidden = false;
  els.listsUndo.replaceChildren();
  const span = document.createElement("span");
  span.textContent = `${t(lang, "listBlockTabDone", { domain })} `;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "text-button";
  btn.textContent = t(lang, "listBlockTabUndo");
  btn.addEventListener("click", async () => {
    const res = await api.runtime.sendMessage({ type: "SHIELD_LISTS_REMOVE", domain });
    clearUndoBlockTab();
    if (res?.ok) {
      renderLists(res.lists);
      setListsStatus(t(lang, "listBlockTabUndone", { domain }));
    }
  });
  els.listsUndo.append(span, btn);
  undoBlockTab = {
    domain,
    timer: setTimeout(() => clearUndoBlockTab(), 30_000)
  };
}

els.listBlockTabBtn?.addEventListener("click", async () => {
  if (normalizePrivacyMode(els.privacySelect?.value) === "off") {
    setListsStatus(t(lang, "listsNeedLocal"));
    return;
  }
  const res = await api.runtime.sendMessage({ type: "SHIELD_LISTS_BLOCK_TAB" });
  if (res?.ok) {
    renderLists(res.lists);
    if (res.dnr?.truncated) noteDnr(res);
    else setListsStatus(t(lang, "listBlockTabDone", { domain: res.domain || "" }));
    showUndoBlockTab(res.domain);
  } else {
    setListsStatus(
      res?.error === "need-http-tab" ? t(lang, "websiteApiNeedHttp") : res?.error || t(lang, "listsNeedLocal")
    );
  }
});

els.listsExportBtn?.addEventListener("click", async () => {
  const res = await api.runtime.sendMessage({ type: "SHIELD_LISTS_EXPORT" });
  if (!res?.ok || !res.json) return;
  const blob = new Blob([res.json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = res.filename || `shield-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  setListsStatus(t(lang, "listsExported"));
});

els.listsSupportBlobBtn?.addEventListener("focus", () => {
  announceSupportNeedDiagIfDisabled();
});

els.listsSupportBlobBtn?.addEventListener("click", async () => {
  if (
    els.listsSupportBlobBtn.getAttribute("aria-disabled") === "true" ||
    normalizePrivacyMode(els.privacySelect?.value) !== "share"
  ) {
    setListsStatus(t(lang, "listsSupportNeedDiag"));
    return;
  }
  const res = await api.runtime.sendMessage({ type: "SHIELD_SUPPORT_BLOB" });
  if (!res?.ok) {
    setListsStatus(
      res?.error === "need-diagnostics"
        ? t(lang, "listsSupportNeedDiag")
        : t(lang, "listsSupportBlobFail", { error: res?.error || "failed" })
    );
    return;
  }
  try {
    await navigator.clipboard.writeText(JSON.stringify(res.blob, null, 2));
    setListsStatus(t(lang, "listsSupportBlobOk"));
    updateMuteWindowChip(res.blob?.trackersApiAnnounceActive === true);
  } catch {
    setListsStatus(t(lang, "listsSupportBlobFail", { error: "clipboard" }));
  }
});

els.listsImportBtn?.addEventListener("click", () => {
  els.listsImportFile?.click();
});

els.listsImportFile?.addEventListener("change", async () => {
  const file = els.listsImportFile?.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    let backup = text.trim();
    if (backup.startsWith("{") || backup.startsWith("[")) backup = JSON.parse(backup);
    await importBackupPayload(backup);
  } catch (err) {
    setListsStatus(err instanceof Error ? err.message : t(lang, "listsImportFail"));
  }
  if (els.listsImportFile) els.listsImportFile.value = "";
});

els.listsPasteQrBtn?.addEventListener("click", async () => {
  if (normalizePrivacyMode(els.privacySelect?.value) === "off") {
    setListsStatus(t(lang, "listsNeedLocal"));
    return;
  }
  const text = await readClipboardText();
  if (!text) {
    showPasteFallback();
    return;
  }
  if (!text.startsWith("{") && !text.startsWith("ZB1:")) {
    setListsStatus(t(lang, "listsPasteQrFail"));
    showPasteFallback();
    return;
  }
  try {
    await importBackupPayload(text.startsWith("{") ? JSON.parse(text) : text, { flash: true });
  } catch {
    setListsStatus(t(lang, "listsPasteQrFail"));
    showPasteFallback();
  }
});

els.listsPasteFallbackApply?.addEventListener("click", async () => {
  if (normalizePrivacyMode(els.privacySelect?.value) === "off") {
    setListsStatus(t(lang, "listsNeedLocal"));
    return;
  }
  const text = (els.listsPasteFallbackArea?.value || "").trim();
  if (!text || (!text.startsWith("{") && !text.startsWith("ZB1:"))) {
    setListsStatus(t(lang, "listsPasteQrFail"));
    return;
  }
  try {
    await importBackupPayload(text.startsWith("{") ? JSON.parse(text) : text, { flash: true });
  } catch {
    setListsStatus(t(lang, "listsPasteQrFail"));
  }
});

els.listsQrBtn?.addEventListener("click", async () => {
  const res = await api.runtime.sendMessage({ type: "SHIELD_LISTS_EXPORT" });
  if (!res?.ok || !res.compact) {
    setListsStatus(t(lang, "listsQrFail"));
    return;
  }
  lastQrCompact = res.compact;
  const lists = res.lists || { blocked: [], trusted: [] };
  const canDraw = globalThis.ShieldQr?.listsFitQrCanvas?.(lists);
  if (!canDraw) {
    if (els.listsQrWrap) els.listsQrWrap.hidden = true;
    setListsStatus(t(lang, "listsQrTooBig", { limit: globalThis.ShieldQr?.QR_HOST_LIMIT || 40 }));
    return;
  }
  if (!els.listsQrCanvas || !globalThis.ShieldQr?.drawQrToCanvas) {
    setListsStatus(t(lang, "listsQrFail"));
    return;
  }
  globalThis.ShieldQr.drawQrToCanvas(els.listsQrCanvas, res.compact, { width: 160 }, (err) => {
    if (err) {
      setListsStatus(t(lang, "listsQrFail"));
      return;
    }
    if (els.listsQrWrap) els.listsQrWrap.hidden = false;
    if (els.listsQrHint) els.listsQrHint.textContent = t(lang, "listsQrShown");
    setListsStatus(t(lang, "listsQrShown"));
  });
});

els.listsQrCopyBtn?.addEventListener("click", async () => {
  const text = lastQrCompact;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    setListsStatus(t(lang, "listsQrCopied"));
  } catch {
    setListsStatus(t(lang, "listsQrFail"));
  }
});

els.websiteApiToggle?.addEventListener("change", () => {
  void runWebsiteApiCheck();
});

async function clearFallbackNotice() {
  hideFallbackNotice();
  try {
    await api.storage.local.remove(API_BASE_FALLBACK_NOTICE_KEY);
  } catch {
    /* ignore */
  }
}

els.websiteApiBase?.addEventListener("input", () => {
  void clearFallbackNotice();
});

els.websiteApiBase?.addEventListener("change", () => {
  void clearFallbackNotice();
  const base = apiBase();
  if (!isValidApiBase(base)) {
    if (els.websiteApiBase) els.websiteApiBase.value = DEFAULT_API_BASE;
    void persistApiBase();
    showFallbackNotice();
    void api.storage.local.set({ [API_BASE_FALLBACK_NOTICE_KEY]: true }).catch(() => {});
    return;
  }
  void persistApiBase();
});

refreshFromBackground().catch((err) => {
  console.debug("[shield popup] init failed", err);
});