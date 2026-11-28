/**
 * Slim popup — status readout for continuous background monitoring.
 * Auto-scan / toasts live in the service worker (every http(s) navigation + tab focus).
 * Language + theme follow the OS (no manual controls).
 */
import { normalizeUiLang, t } from "../shared/i18n.js";
import { api } from "../shared/browser-api.js";
import { DEFAULT_API_BASE } from "../shared/api-base-migrate.mjs";
/** CI: popup must import this key (Website API chrome moved off popup). */
import { API_BASE_FALLBACK_NOTICE_KEY } from "../shared/api-base-fallback.mjs";
import {
  CHINA_NOTICE_URL,
  probeWorkersHealth,
  applyUnreachableUi,
  resolveChinaNoticePrimary,
  formatUnreachableWithProbeMs
} from "./workers-reach.mjs";
void API_BASE_FALLBACK_NOTICE_KEY;

const BRAND_ALT = "buusdo Cybersecurity Service Tool";

/** Consecutive /api/health failures (reset on success). */
let workersFailStreak = 0;
let probeBusy = false;

const els = {
  readout: document.getElementById("readout"),
  statusWord: document.getElementById("statusWord"),
  statusDetail: document.getElementById("statusDetail"),
  tabHost: document.getElementById("tabHost"),
  trackersLabel: document.getElementById("trackersLabel"),
  trackersValue: document.getElementById("trackersValue"),
  phishingLabel: document.getElementById("phishingLabel"),
  phishingValue: document.getElementById("phishingValue"),
  manageListsLink: document.getElementById("manageListsLink"),
  manageListsHint: document.getElementById("manageListsHint"),
  apiUnreachable: document.getElementById("apiUnreachable"),
  apiUnreachableText: document.getElementById("apiUnreachableText"),
  chinaNoticeCta: document.getElementById("chinaNoticeCta"),
  workersOpenCta: document.getElementById("workersOpenCta"),
  workersRetryBtn: document.getElementById("workersRetryBtn"),
  wordmark: document.querySelector(".brand-lockup img[data-brand-wordmark], .brand-lockup img.brand-logo")
};

function resolveSystemLang() {
  try {
    if (api?.i18n?.getUILanguage) {
      return normalizeUiLang(api.i18n.getUILanguage());
    }
  } catch {
    /* fall through */
  }
  return normalizeUiLang(navigator.language || navigator.languages?.[0] || "en");
}

function sameWordmarkSrc(img, next) {
  const cur = img.getAttribute("src") || "";
  if (cur === next) return true;
  try {
    return (
      new URL(cur, location.href).pathname === new URL(next, location.href).pathname
    );
  } catch {
    return cur.endsWith(next) || next.endsWith(cur);
  }
}

/** Apply OS color-scheme and swap the single logo SVG src (only when path changes). */
function applyThemeFromSystem() {
  const light = window.matchMedia("(prefers-color-scheme: light)").matches;
  document.documentElement.dataset.theme = light ? "light" : "dark";
  document.documentElement.style.colorScheme = light ? "light" : "dark";
  const img = els.wordmark;
  if (!img) return;
  const darkSrc = img.getAttribute("data-src-dark") || "../icons/buusdo-wordmark.svg";
  const lightSrc = img.getAttribute("data-src-light") || "../icons/buusdo-wordmark-on-light.svg";
  const next = light ? lightSrc : darkSrc;
  if (!sameWordmarkSrc(img, next)) img.setAttribute("src", next);
  img.setAttribute("alt", "");
  img.setAttribute("aria-hidden", "true");
  const lockup = img.closest(".brand-lockup");
  if (lockup) lockup.setAttribute("aria-label", BRAND_ALT);
}

function levelWord(lang, level) {
  if (level === "safe") return t(lang, "statusSafe");
  if (level === "caution") return t(lang, "statusCaution");
  if (level === "danger") return t(lang, "statusDanger");
  return t(lang, "statusStandby");
}

function levelDetail(lang, level) {
  if (level === "safe") return t(lang, "detailSafe");
  if (level === "caution") return t(lang, "detailCaution");
  if (level === "danger") return t(lang, "detailDanger");
  return t(lang, "statusWatching") || t(lang, "statusIdle");
}

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/\.$/, "");
  } catch {
    return "";
  }
}

let privacyHostHintEl = null;

function ensurePrivacyHostHint() {
  if (privacyHostHintEl || !els.tabHost?.parentElement) return privacyHostHintEl;
  privacyHostHintEl = document.createElement("p");
  privacyHostHintEl.id = "privacyHostHint";
  privacyHostHintEl.className = "tab-host-hint";
  privacyHostHintEl.hidden = true;
  els.tabHost.parentElement.insertBefore(privacyHostHintEl, els.tabHost.nextSibling);
  return privacyHostHintEl;
}

function paintTabHost(lang, host, privacyMode) {
  if (!els.tabHost) return;
  const hintEl = ensurePrivacyHostHint();
  if (!host) {
    els.tabHost.hidden = true;
    els.tabHost.textContent = "";
    if (hintEl) hintEl.hidden = true;
    return;
  }
  els.tabHost.hidden = false;
  els.tabHost.textContent = host;
  els.tabHost.title = t(lang, "currentTab") || "Current tab";
  if (hintEl && privacyMode === "off") {
    hintEl.hidden = false;
    hintEl.textContent =
      t(lang, "privacyHostVisibleHint") ||
      "Host shown only here for orientation — not stored in extension history.";
  } else if (hintEl) {
    hintEl.hidden = true;
    hintEl.textContent = "";
  }
}

function paint(lang, state, scanExtras = {}) {
  const level = state?.lastScan?.level || "idle";
  if (els.readout) els.readout.dataset.level = level;
  if (els.statusWord) els.statusWord.textContent = levelWord(lang, level);
  if (els.statusDetail) {
    let detail =
      level === "idle"
        ? t(lang, "statusWatching") ||
          t(lang, "statusIdle") ||
          "Watching every tab — alerts appear on the page."
        : levelDetail(lang, level);
    if (scanExtras.apiSoftFailed || state?.lastScan?.apiSoftFailed) {
      const localHint =
        t(lang, "statusLocalOnly") ||
        "Website check unavailable — level is from local signals only, not API verified.";
      detail = `${detail} ${localHint}`;
    }
    els.statusDetail.textContent = detail;
  }
  if (els.trackersLabel) els.trackersLabel.textContent = t(lang, "trackersBlocked");
  if (els.phishingLabel) els.phishingLabel.textContent = t(lang, "phishingHits");
  if (els.trackersValue) {
    els.trackersValue.textContent = String(state?.lastScan?.trackersBlocked ?? 0);
  }
  if (els.phishingValue) {
    els.phishingValue.textContent = String(state?.lastScan?.phishingHits ?? 0);
  }
  if (els.manageListsLink) {
    const base = String(DEFAULT_API_BASE || "https://buusdocst.mtsu.workers.dev").replace(/\/$/, "");
    const blocked = String(state?.lastBlockedDomain || "").trim();
    const q = blocked ? `?blocked=${encodeURIComponent(blocked)}` : "";
    els.manageListsLink.href = `${base}/${lang}/lists-offline${q}`;
    els.manageListsLink.textContent = t(lang, "manageLists") || "Manage block & trust lists";
  }
  if (els.manageListsHint) {
    const blocked = String(state?.lastBlockedDomain || "").trim();
    if (blocked) {
      els.manageListsHint.textContent = (
        t(lang, "manageListsJustBlocked") || "Just blocked: {domain} — lists open on the website."
      ).replace("{domain}", blocked);
    } else {
      els.manageListsHint.textContent =
        t(lang, "manageListsHint") || "Lists open on the website — not in this popup.";
    }
  }
}

async function syncPrefsFromSystem(lang) {
  try {
    await api.runtime.sendMessage({ type: "SHIELD_SET_PREFS", lang });
  } catch {
    /* ignore */
  }
}

function acceptLanguages() {
  try {
    return Array.from(navigator.languages || [navigator.language].filter(Boolean));
  } catch {
    return [];
  }
}

/**
 * @param {string} lang
 * @param {boolean} unreachable
 * @param {{ ms?: number, timedOut?: boolean }} [probe]
 */
function paintUnreachable(lang, unreachable, probe = {}) {
  const manage = els.manageListsLink;
  const manageWrap = manage?.closest?.("p.manage") || manage?.parentElement;
  const chinaPrimary = resolveChinaNoticePrimary({
    lang,
    acceptLanguages: acceptLanguages(),
    failStreak: workersFailStreak
  });
  const base = String(DEFAULT_API_BASE || "https://buusdocst.mtsu.workers.dev").replace(
    /\/$/,
    ""
  );
  const hintWhenDown =
    t(lang, "manageListsWorkersDown") ||
    "Website lists need Workers; API unreachable — not a country check. Retry the site or, if on mainland China, open the notice.";
  applyUnreachableUi(
    {
      box: els.apiUnreachable,
      manage,
      manageWrap,
      manageHint: els.manageListsHint,
      chinaCta: els.chinaNoticeCta,
      workersCta: els.workersOpenCta,
      retryBtn: els.workersRetryBtn
    },
    unreachable,
    {
      hintWhenDown,
      chinaPrimary,
      chinaLabel:
        t(lang, "websiteApiChinaNoticeLink") || "Mainland notice (if in China)",
      workersLabel: t(lang, "websiteApiWorkersOpenLink") || "Open website",
      retryLabel: t(lang, "websiteApiRetryProbe") || "Retry probe",
      retryBusy: probeBusy,
      noticeHref: CHINA_NOTICE_URL,
      workersHref: `${base}/?utm_source=extension`
    }
  );
  if (unreachable && els.apiUnreachableText) {
    const baseCopy =
      t(lang, "websiteApiCfUnreachable") ||
      "Cannot reach workers.dev. Connectivity — not IP/country detection. Retry; mainland notice only if China blocks Workers.";
    els.apiUnreachableText.textContent = formatUnreachableWithProbeMs(baseCopy, probe, {
      timeoutSuffix: t(lang, "websiteApiProbeHitTimeout") || " (hit timeout)"
    });
  }
}

/**
 * @param {string} [base]
 * @returns {Promise<boolean>} unreachable
 */
async function runWorkersProbe(base) {
  const origin = String(
    base || DEFAULT_API_BASE || "https://buusdocst.mtsu.workers.dev"
  ).replace(/\/$/, "");
  probeBusy = true;
  if (els.workersRetryBtn) els.workersRetryBtn.disabled = true;
  const probe = await probeWorkersHealth({ base: origin });
  probeBusy = false;
  if (probe.unreachable) workersFailStreak += 1;
  else workersFailStreak = 0;
  const lang = resolveSystemLang();
  paintUnreachable(lang, probe.unreachable, probe);
  return probe.unreachable;
}

/**
 * Prefer the active http(s) tab; if the popup was opened from chrome://extensions
 * (no host), fall back to the last focused http(s) tab in this window.
 * @returns {Promise<{ tabId: number, url: string, host: string } | null>}
 */
async function resolveWatchTab() {
  try {
    const active = await api.tabs.query({ active: true, currentWindow: true });
    const a = active?.[0];
    if (a?.id && a.url && /^https?:/i.test(a.url)) {
      return { tabId: a.id, url: a.url, host: hostFromUrl(a.url) };
    }
    const httpTabs = await api.tabs.query({ currentWindow: true });
    const hit = (httpTabs || []).find((t) => t?.id && t.url && /^https?:/i.test(t.url));
    if (hit) {
      return { tabId: hit.id, url: hit.url, host: hostFromUrl(hit.url) };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Readout only — background already watches every http(s) tab.
 * Ask SW for the latest auto-scan of the watched tab (no user "Check" control).
 */
async function syncActiveTabState(watch) {
  if (!watch?.tabId || !watch.url) return null;
  try {
    const res = await api.runtime.sendMessage({
      type: "SHIELD_SCAN",
      tabId: watch.tabId,
      url: watch.url,
      softCheck: true,
      force: false
    });
    return { result: res?.result || null, apiSoftFailed: Boolean(res?.apiSoftFailed) };
  } catch {
    return null;
  }
}

async function refresh() {
  const lang = resolveSystemLang();
  document.documentElement.lang = lang === "pt-PT" ? "pt" : lang;
  applyThemeFromSystem();
  await syncPrefsFromSystem(lang);
  let state = null;
  try {
    const res = await api.runtime.sendMessage({ type: "SHIELD_GET_STATE" });
    state = res?.state || null;
  } catch {
    state = null;
  }
  const privacyMode = state?.privacyMode ?? "off";
  const watch = await resolveWatchTab();
  paintTabHost(lang, watch?.host || "", privacyMode);

  const scanPayload = await syncActiveTabState(watch);
  const scanResult = scanPayload?.result ?? null;
  const apiSoftFailed = Boolean(scanPayload?.apiSoftFailed);

  if (scanResult && state) {
    state = { ...state, lastScan: { ...(state.lastScan || {}), ...scanResult } };
  }
  paint(lang, state, { apiSoftFailed });
  if (!watch && els.statusDetail) {
    els.statusDetail.textContent =
      t(lang, "statusNeedHttp") ||
      "Open any http(s) website — watching runs automatically (no button).";
  }

  await runWorkersProbe();
}

applyThemeFromSystem();
const mq = window.matchMedia("(prefers-color-scheme: light)");
mq.addEventListener?.("change", () => {
  applyThemeFromSystem();
});

els.workersRetryBtn?.addEventListener("click", () => {
  if (probeBusy) return;
  void runWorkersProbe();
});

try {
  api.storage?.onChanged?.addListener((changes, area) => {
    if (area !== "local") return;
    if (!changes?.shieldState) return;
    void (async () => {
      const lang = resolveSystemLang();
      const next = changes.shieldState.newValue || null;
      const watch = await resolveWatchTab();
      paintTabHost(lang, watch?.host || "", next?.privacyMode ?? "off");
      paint(lang, next, { apiSoftFailed: Boolean(next?.lastScan?.apiSoftFailed) });
    })();
  });
} catch {
  /* ignore */
}

void refresh();
