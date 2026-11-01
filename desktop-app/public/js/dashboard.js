/**
 * Desktop dashboard controller — Ookla-style Scan UI + live SSE block feed.
 */

import { t } from "./i18n.js";
import { afterRingClear, lifetimeChipTitles } from "./lifetime-chip.mjs";
import {
  clearPersistedScanResourcesStorage,
  readPersistedScanResources,
  shouldPersistScanResources,
  writePersistedScanResources
} from "./scan-resources-session.mjs";

function normalizePrivacyMode(value) {
  if (value === "local" || value === "share") return value;
  return "off";
}

const els = {
  appTitle: document.getElementById("appTitle"),
  statusKicker: document.getElementById("statusKicker"),
  langLabel: document.getElementById("langLabel"),
  langSelect: document.getElementById("langSelect"),
  scanBtn: document.getElementById("scanBtn"),
  scanLabel: document.getElementById("scanLabel"),
  readout: document.getElementById("readout"),
  statusWord: document.getElementById("statusWord"),
  statusHost: document.getElementById("statusHost"),
  statusDetail: document.getElementById("statusDetail"),
  trackersLabel: document.getElementById("trackersLabel"),
  phishingLabel: document.getElementById("phishingLabel"),
  trackersValue: document.getElementById("trackersValue"),
  phishingValue: document.getElementById("phishingValue"),
  lastScanLabel: document.getElementById("lastScanLabel"),
  lastScanValue: document.getElementById("lastScanValue"),
  privacyLabel: document.getElementById("privacyLabel"),
  privacySelect: document.getElementById("privacySelect"),
  privacyHint: document.getElementById("privacyHint"),
  logTitle: document.getElementById("logTitle"),
  logHint: document.getElementById("logHint"),
  blockLog: document.getElementById("blockLog"),
  checkLabel: document.getElementById("checkLabel"),
  checkUrl: document.getElementById("checkUrl"),
  scanResources: document.getElementById("scanResources"),
  scanResourcesLabel: document.getElementById("scanResourcesLabel"),
  scanResourcesHint: document.getElementById("scanResourcesHint"),
  websiteHealthBtn: document.getElementById("websiteHealthBtn"),
  websiteHealthLabel: document.getElementById("websiteHealthLabel"),
  websiteCheckBtn: document.getElementById("websiteCheckBtn"),
  websiteCheckLabel: document.getElementById("websiteCheckLabel"),
  websiteCheckStatus: document.getElementById("websiteCheckStatus"),
  proxyBody: document.getElementById("proxyBody"),
  toastHost: document.getElementById("toastHost"),
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
  accountSignInForm: document.getElementById("accountSignInForm"),
  listsOfflineBackup: document.getElementById("listsOfflineBackup"),
  listsTitle: document.getElementById("listsTitle"),
  listsHint: document.getElementById("listsHint"),
  listDomain: document.getElementById("listDomain"),
  listBlockBtn: document.getElementById("listBlockBtn"),
  listTrustBtn: document.getElementById("listTrustBtn"),
  listsStatus: document.getElementById("listsStatus"),
  listsPath: document.getElementById("listsPath"),
  blockedTitle: document.getElementById("blockedTitle"),
  trustedTitle: document.getElementById("trustedTitle"),
  blockedList: document.getElementById("blockedList"),
  trustedList: document.getElementById("trustedList"),
  listsExportBtn: document.getElementById("listsExportBtn"),
  listsCopyPathBtn: document.getElementById("listsCopyPathBtn"),
  listsRevealBtn: document.getElementById("listsRevealBtn"),
  listsImportBtn: document.getElementById("listsImportBtn"),
  logFilterAll: document.getElementById("logFilterAll"),
  logFilterTracker: document.getElementById("logFilterTracker"),
  logFilterPhishing: document.getElementById("logFilterPhishing"),
  logFilterPersonal: document.getElementById("logFilterPersonal"),
  logFilterTrackerCount: document.getElementById("logFilterTrackerCount"),
  logFilterPhishingCount: document.getElementById("logFilterPhishingCount"),
  logFilterPersonalCount: document.getElementById("logFilterPersonalCount"),
  logFilterTrackerLife: document.getElementById("logFilterTrackerLife"),
  logFilterPhishingLife: document.getElementById("logFilterPhishingLife"),
  logFilterReset: document.getElementById("logFilterReset"),
  listsOperatorHint: document.getElementById("listsOperatorHint"),
  listsQrZlib: document.getElementById("listsQrZlib"),
  listsQrZlibLabel: document.getElementById("listsQrZlibLabel"),
  listsQrBtn: document.getElementById("listsQrBtn"),
  listsQrWrap: document.getElementById("listsQrWrap"),
  listsQrCanvas: document.getElementById("listsQrCanvas"),
  listsQrHint: document.getElementById("listsQrHint"),
  listsQrCopyBtn: document.getElementById("listsQrCopyBtn"),
  listsImportFile: document.getElementById("listsImportFile"),
  listAddForm: document.getElementById("listAddForm")
};

/** @type {string|null} */
let listsFilePath = null;
/** @type {string|null} */
let lastQrCompact = null;
const LOG_FILTER_KEY = "shieldDesktopLogFilter";

/** @type {'all'|'tracker'|'phishing'|'user-block'} */
let logFilter = (() => {
  try {
    const v = sessionStorage.getItem(LOG_FILTER_KEY);
    if (v === "tracker" || v === "phishing" || v === "user-block" || v === "all") return v;
  } catch {
    /* ignore */
  }
  return "all";
})();

function currentPrivacyMode() {
  return normalizePrivacyMode(els.privacySelect?.value);
}

function clearPersistedScanResources() {
  clearPersistedScanResourcesStorage();
  if (els.scanResources) els.scanResources.value = "";
}

function restorePersistedScanResources() {
  if (!els.scanResources) return;
  if (!shouldPersistScanResources(currentPrivacyMode())) {
    els.scanResources.value = "";
    return;
  }
  els.scanResources.value = readPersistedScanResources();
}

function persistScanResourcesIfAllowed() {
  if (!els.scanResources) return;
  const ok = writePersistedScanResources(els.scanResources.value || "", currentPrivacyMode());
  if (!ok && els.scanResources && !shouldPersistScanResources(currentPrivacyMode())) {
    els.scanResources.value = "";
  }
}
/** @type {Array<object>} */
let lastBlocks = [];

/** @type {boolean} */
let websiteReachable = false;

/** Poll interval from server env WEBSITE_HEALTH_POLL_MS (default 15s, min 5s). */
let websiteHealthPollMs = 15_000;
/** Hostname (or full base) from WEBSITE_CHECK_URL via /api/state. */
let websiteCheckHost = "localhost:3000";

/** @type {'en'|'pt-PT'} */
let lang = "en";
/** @type {object|null} */
let currentState = null;
/** @type {{ debounceMs?: number, listsPathBasename?: string } | null} */
let lastOperatorHint = null;

function applyI18n() {
  els.appTitle.textContent = t(lang, "appTitle");
  els.statusKicker.textContent = t(lang, "statusKicker");
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
  els.logTitle.textContent = t(lang, "logTitle");
  els.logHint.textContent = t(lang, "logHint");
  els.checkLabel.textContent = t(lang, "checkLabel");
  els.checkUrl.placeholder = t(lang, "checkPlaceholder");
  if (els.scanResourcesLabel) els.scanResourcesLabel.textContent = t(lang, "scanResourcesLabel");
  if (els.scanResources) els.scanResources.placeholder = t(lang, "scanResourcesPlaceholder");
  if (els.scanResourcesHint) els.scanResourcesHint.textContent = t(lang, "scanResourcesHint");
  if (els.websiteHealthLabel) els.websiteHealthLabel.textContent = t(lang, "websiteHealth");
  if (els.websiteCheckLabel) els.websiteCheckLabel.textContent = t(lang, "websiteCheck");
  if (els.websiteCheckBtn) els.websiteCheckBtn.disabled = !websiteReachable;
  els.proxyBody.textContent = t(lang, "proxyBody");
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
  if (els.listBlockBtn) els.listBlockBtn.textContent = t(lang, "listsBlock");
  if (els.listTrustBtn) els.listTrustBtn.textContent = t(lang, "listsTrust");
  if (els.blockedTitle) els.blockedTitle.textContent = t(lang, "listsBlocked");
  if (els.trustedTitle) els.trustedTitle.textContent = t(lang, "listsTrusted");
  if (els.listsExportBtn) els.listsExportBtn.textContent = t(lang, "listsExport");
  if (els.listsCopyPathBtn) els.listsCopyPathBtn.textContent = t(lang, "listsCopyPath");
  if (els.listsRevealBtn) els.listsRevealBtn.textContent = t(lang, "listsReveal");
  if (els.listsImportBtn) els.listsImportBtn.textContent = t(lang, "listsImport");
  if (els.listsQrBtn) els.listsQrBtn.textContent = t(lang, "listsQr");
  if (els.listsQrCopyBtn) els.listsQrCopyBtn.textContent = t(lang, "listsQrCopy");
  if (els.logFilterAll) els.logFilterAll.textContent = t(lang, "logFilterAll");
  refreshFilterChipLabel(els.logFilterTracker, els.logFilterTrackerCount, t(lang, "logFilterTracker"));
  refreshFilterChipLabel(els.logFilterPhishing, els.logFilterPhishingCount, t(lang, "logFilterPhishing"));
  refreshFilterChipLabel(els.logFilterPersonal, els.logFilterPersonalCount, t(lang, "logFilterPersonal"));
  if (els.logFilterReset) {
    els.logFilterReset.textContent = t(lang, "logFilterReset");
    els.logFilterReset.title = t(lang, "logFilterResetTitle");
  }
  if (els.listsQrZlibLabel) els.listsQrZlibLabel.textContent = t(lang, "listsQrZlib");
  if (els.listsOperatorHint && !els.listsOperatorHint.hidden && lastOperatorHint) {
    els.listsOperatorHint.textContent = formatOperatorHint(lastOperatorHint);
  }
  document.documentElement.lang = lang === "pt-PT" ? "pt-PT" : "en";
}

function refreshFilterChipLabel(btn, countEl, label) {
  if (!btn) return;
  btn.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) node.remove();
  });
  btn.insertBefore(document.createTextNode(label + " "), countEl || null);
}

function updateLifetimeChip(el, total) {
  if (!el) return;
  const tip = t(lang, "logFilterLifeTitle");
  const parent = el.closest?.("button.log-filter");
  const state = lifetimeChipTitles(total, tip);
  const n = Number(total) || 0;
  if (state.show) {
    el.hidden = false;
    el.textContent = t(lang, "logFilterLife", { n: String(n) });
    el.title = state.title;
    if (parent) parent.title = state.parentTitle;
  } else {
    el.hidden = true;
    el.textContent = "";
    el.title = state.title;
    if (parent) parent.title = state.parentTitle;
  }
}

function formatOperatorHint(info) {
  const ms = info.debounceMs != null ? String(info.debounceMs) : "—";
  const base = info.listsPathBasename || "shield-backup.json";
  return t(lang, "listsOperatorHint", { ms, file: base });
}

function showOperatorHint(info) {
  lastOperatorHint = info;
  if (!els.listsOperatorHint) return;
  els.listsOperatorHint.hidden = false;
  els.listsOperatorHint.textContent = formatOperatorHint(info);
}

function setListsStatus(msg) {
  if (!els.listsStatus) return;
  els.listsStatus.hidden = !msg;
  els.listsStatus.textContent = msg || "";
}

function renderMiniList(ul, entries, emptyLabel) {
  if (!ul) return;
  ul.innerHTML = "";
  const rows = Array.isArray(entries) ? entries : [];
  if (!rows.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = emptyLabel;
    ul.appendChild(li);
    return;
  }
  for (const entry of rows) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = entry.domain;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "text-button";
    btn.textContent = t(lang, "listsRemove");
    btn.addEventListener("click", async () => {
      const res = await fetch("/api/lists/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: entry.domain })
      }).then((r) => r.json());
      if (res?.ok) {
        renderLists(res.lists);
        setListsStatus(t(lang, "listsSaved"));
      }
    });
    li.appendChild(span);
    li.appendChild(btn);
    ul.appendChild(li);
  }
}

function renderLists(lists) {
  renderMiniList(els.blockedList, lists?.blocked, t(lang, "listsEmpty"));
  renderMiniList(els.trustedList, lists?.trusted, t(lang, "listsEmpty"));
}

function setListsPathDisplay(filePath, mtimeMs) {
  if (!els.listsPath || !filePath) return;
  listsFilePath = filePath;
  els.listsPath.hidden = false;
  let text = t(lang, "listsPathLabel", { path: filePath });
  if (mtimeMs != null && Number.isFinite(Number(mtimeMs))) {
    let mtime = String(mtimeMs);
    try {
      mtime = new Date(Number(mtimeMs)).toLocaleString(lang === "pt-PT" ? "pt-PT" : "en-GB");
    } catch {
      /* keep numeric */
    }
    text += t(lang, "listsMtimeLabel", { mtime });
  }
  els.listsPath.textContent = text;
}

async function refreshLists() {
  const res = await fetch("/api/lists").then((r) => r.json());
  if (res?.ok) {
    renderLists(res.lists);
    if (res.path) setListsPathDisplay(res.path, res.mtimeMs);
  }
}

function riskLevelToReadout(level) {
  if (level === "CRITICAL" || level === "HIGH") return "danger";
  if (level === "CAUTION" || level === "UNKNOWN") return "caution";
  if (level === "LOW_EVIDENCE") return "safe";
  return "idle";
}

function wordFor(level) {
  if (level === "danger") return t(lang, "statusDanger");
  if (level === "caution") return t(lang, "statusCaution");
  if (level === "safe") return t(lang, "statusSafe");
  return t(lang, "statusStandby");
}

function setReadout(level) {
  const shown = level === "idle" ? "idle" : level;
  els.readout.dataset.level = shown;
  els.statusWord.textContent = wordFor(shown);
  renderStatusHostChip();
}

/** Surface WEBSITE_CHECK_URL host on the status chip (not only health toast). */
function renderStatusHostChip() {
  if (!els.statusHost) return;
  if (!websiteCheckHost) {
    els.statusHost.hidden = true;
    els.statusHost.textContent = "";
    return;
  }
  els.statusHost.hidden = false;
  els.statusHost.textContent = websiteCheckHost;
}

function sourceLabel(source) {
  if (source === "scan") return t(lang, "sourceScan");
  if (source === "proxy-connect") return t(lang, "sourceConnect");
  return t(lang, "sourceProxy");
}

function updateKindBadge(el, kind) {
  if (!el) return;
  const n = lastBlocks.filter((b) => b.kind === kind).length;
  if (n > 0) {
    el.hidden = false;
    el.textContent = String(n);
  } else {
    el.hidden = true;
    el.textContent = "0";
  }
}

function updatePersonalBadge() {
  updateKindBadge(els.logFilterTrackerCount, "tracker");
  updateKindBadge(els.logFilterPhishingCount, "phishing");
  updateKindBadge(els.logFilterPersonalCount, "user-block");
  updateLifetimeChip(els.logFilterTrackerLife, currentState?.totalTrackersBlocked);
  updateLifetimeChip(els.logFilterPhishingLife, currentState?.totalPhishingBlocked);
}

function renderLog(blocks) {
  lastBlocks = Array.isArray(blocks) ? blocks : [];
  updatePersonalBadge();
  const filtered =
    logFilter === "all" ? lastBlocks : lastBlocks.filter((b) => b.kind === logFilter);
  els.blockLog.innerHTML = "";
  if (!filtered.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = t(lang, "logEmpty");
    els.blockLog.appendChild(li);
    return;
  }

  for (const b of filtered) {
    const li = document.createElement("li");
    const kind = document.createElement("div");
    kind.className = `kind kind-${b.kind === "user-block" ? "user-block" : b.kind}`;
    kind.textContent =
      b.kind === "user-block"
        ? t(lang, "kindUserBlock")
        : b.kind === "phishing"
          ? t(lang, "statusDanger")
          : t(lang, "statusCaution");

    const display = document.createElement("div");
    display.textContent = b.display;

    const meta = document.createElement("div");
    meta.className = "meta";
    let when = b.at;
    try {
      when = new Date(b.at).toLocaleString(lang === "pt-PT" ? "pt-PT" : "en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      /* keep raw */
    }
    meta.textContent = `${sourceLabel(b.source)} · ${when}`;

    li.append(kind, display, meta);
    els.blockLog.appendChild(li);
  }
}

function renderState(snap) {
  currentState = snap;
  const level = snap.lastScan?.level || "idle";
  setReadout(level);

  els.trackersValue.textContent = String(snap.totalTrackersBlocked ?? 0);
  els.phishingValue.textContent = String(snap.totalPhishingBlocked ?? 0);

  if (!snap.lastScan || level === "idle") {
    els.statusDetail.textContent = t(lang, "statusIdle");
  } else if (level === "danger") {
    els.statusDetail.textContent = t(lang, "detailDanger");
  } else if (level === "caution") {
    els.statusDetail.textContent = t(lang, "detailCaution");
  } else {
    els.statusDetail.textContent = t(lang, "detailSafe");
  }

  if (snap.lastScanAt) {
    try {
      els.lastScanValue.textContent = new Date(snap.lastScanAt).toLocaleString(
        lang === "pt-PT" ? "pt-PT" : "en-GB",
        { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }
      );
    } catch {
      els.lastScanValue.textContent = snap.lastScanAt;
    }
  } else {
    els.lastScanValue.textContent = t(lang, "never");
  }

  renderLog(snap.recentBlocks);
}

function showToast(kind) {
  const el = document.createElement("div");
  el.className = `toast ${kind === "phishing" || kind === "user-block" ? "toast-danger" : "toast-caution"}`;
  el.textContent =
    kind === "user-block"
      ? t(lang, "toastUserBlock")
      : kind === "phishing"
        ? t(lang, "toastPhishing")
        : t(lang, "toastTracker", { n: 1 });
  els.toastHost.appendChild(el);
  requestAnimationFrame(() => el.classList.add("is-visible"));
  setTimeout(() => {
    el.classList.remove("is-visible");
    setTimeout(() => el.remove(), 320);
  }, 3200);
}

async function fetchState() {
  const res = await fetch("/api/state");
  const data = await res.json();
  if (!data.ok) return;
  lang = data.state.lang === "pt-PT" ? "pt-PT" : "en";
  els.langSelect.value = lang;
  if (els.privacySelect) {
    els.privacySelect.value = normalizePrivacyMode(data.state.privacyMode);
  }
  if (typeof data.websiteHealthPollMs === "number" && data.websiteHealthPollMs >= 5000) {
    websiteHealthPollMs = data.websiteHealthPollMs;
  }
  if (typeof data.websiteCheckUrl === "string" && data.websiteCheckUrl) {
    try {
      websiteCheckHost = new URL(data.websiteCheckUrl).host || data.websiteCheckUrl;
    } catch {
      websiteCheckHost = data.websiteCheckUrl;
    }
    renderStatusHostChip();
  }
  applyI18n();
  renderState(data.state);
  restorePersistedScanResources();
  if (data.lists) renderLists(data.lists);
  if (data.listsPath) {
    setListsPathDisplay(data.listsPath, data.listsMtimeMs);
  }
}

async function runScan() {
  const url = els.checkUrl.value.trim();
  els.scanBtn.classList.add("is-scanning");
  els.scanLabel.textContent = t(lang, "scanning");
  try {
    if (!url) {
      els.statusDetail.textContent = t(lang, "enterAddress");
      return;
    }
    const resources = String(els.scanResources?.value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 300);
    persistScanResourcesIfAllowed();
    await new Promise((r) => setTimeout(r, 400));
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, ...(resources.length ? { resources } : {}) })
    });
    const data = await res.json();
    if (data.ok) {
      if (data.result?.kind) showToast(data.result.kind);
      renderState(data.state);
      if (resources.length && typeof data.result?.thirdPartyTrackers === "number") {
        els.statusDetail.textContent = t(lang, "scanThirdParty", {
          n: String(data.result.thirdPartyTrackers)
        });
      }
    }
  } finally {
    els.scanBtn.classList.remove("is-scanning");
    els.scanLabel.textContent = t(lang, "scan");
  }
}

/**
 * @param {{ silent?: boolean }} [opts]
 */
async function probeWebsiteHealth(opts = {}) {
  const silent = Boolean(opts.silent);
  if (!els.websiteCheckStatus) return;
  if (!silent) {
    els.websiteCheckStatus.hidden = false;
    els.websiteCheckStatus.textContent = t(lang, "websiteHealth") + "…";
    if (els.websiteHealthBtn) els.websiteHealthBtn.disabled = true;
  }
  try {
    const res = await fetch("/api/website-health");
    const data = await res.json();
    if (!res.ok || !data?.ok || !data?.reachable) {
      websiteReachable = false;
      if (els.websiteCheckBtn) els.websiteCheckBtn.disabled = true;
      if (!silent) {
        let fail = `${t(lang, "websiteHealthFail", {
          error: data?.error || `HTTP ${res.status}`
        })} ${t(lang, "websiteCheckHintDev")}`;
        const errText = String(data?.error || data?.source || websiteCheckHost || "");
        if (/127\.0\.0\.1|ECONNREFUSED/i.test(errText)) {
          fail += ` ${t(lang, "websiteCheckHintLocalhost")}`;
        }
        els.websiteCheckStatus.textContent = fail;
      }
      return;
    }
    const wasDown = !websiteReachable;
    websiteReachable = true;
    if (els.websiteCheckBtn) els.websiteCheckBtn.disabled = false;
    if (!silent || wasDown) {
      els.websiteCheckStatus.hidden = false;
      let okText = t(lang, "websiteHealthOk", {
        host: websiteCheckHost,
        ms: data.probeTimeoutMs == null ? "—" : String(data.probeTimeoutMs),
        poll: String(websiteHealthPollMs)
      });
      const echoed =
        typeof data.pollMs === "number" && Number.isFinite(data.pollMs) ? data.pollMs : null;
      if (echoed != null && echoed !== websiteHealthPollMs) {
        okText += ` ${t(lang, "websiteHealthPollEcho", {
          echo: String(echoed),
          poll: String(websiteHealthPollMs)
        })}`;
      }
      els.websiteCheckStatus.textContent = okText;
    }
  } catch (err) {
    websiteReachable = false;
    if (els.websiteCheckBtn) els.websiteCheckBtn.disabled = true;
    if (!silent) {
      let fail = `${t(lang, "websiteHealthFail", {
        error: err instanceof Error ? err.message : "unreachable"
      })} ${t(lang, "websiteCheckHintDev")}`;
      const errText = `${err instanceof Error ? err.message : ""} ${websiteCheckHost || ""}`;
      if (/127\.0\.0\.1|ECONNREFUSED/i.test(errText)) {
        fail += ` ${t(lang, "websiteCheckHintLocalhost")}`;
      }
      els.websiteCheckStatus.textContent = fail;
    }
  } finally {
    if (!silent && els.websiteHealthBtn) els.websiteHealthBtn.disabled = false;
  }
}

/** First-party website POST /api/check via desktop proxy (timing schema validated). */
async function runWebsiteCheck() {
  const url = els.checkUrl.value.trim();
  if (!els.websiteCheckBtn || !els.websiteCheckStatus) return;
  if (!websiteReachable) {
    els.websiteCheckStatus.hidden = false;
    els.websiteCheckStatus.textContent = t(lang, "websiteCheckNeedHealth");
    return;
  }
  if (!url) {
    els.statusDetail.textContent = t(lang, "enterAddress");
    return;
  }
  els.websiteCheckBtn.disabled = true;
  els.websiteCheckStatus.hidden = false;
  els.websiteCheckStatus.textContent = t(lang, "websiteCheckChecking");
  try {
    const res = await fetch("/api/website-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (!res.ok || !data?.ok || !data?.analysis) {
      const err = data?.error || `HTTP ${res.status}`;
      els.websiteCheckStatus.textContent = `${t(lang, "websiteCheckFail", { error: err })} ${t(lang, "websiteCheckHintDev")}`;
      return;
    }
    const level = data.analysis.risk?.level || "?";
    const total = data.analysis.timing?.totalMs;
    const readout = riskLevelToReadout(level);
    setReadout(readout);
    if (readout === "danger") els.statusDetail.textContent = t(lang, "detailDanger");
    else if (readout === "caution") els.statusDetail.textContent = t(lang, "detailCaution");
    else if (readout === "safe") els.statusDetail.textContent = t(lang, "detailSafe");
    els.websiteCheckStatus.textContent = t(lang, "websiteCheckOk", {
      level,
      total: total == null ? "—" : String(total)
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unreachable";
    els.websiteCheckStatus.textContent = `${t(lang, "websiteCheckFail", { error: message })} ${t(lang, "websiteCheckHintDev")}`;
  } finally {
    els.websiteCheckBtn.disabled = !websiteReachable;
  }
}

function connectSSE() {
  const es = new EventSource("/api/events");

  es.addEventListener("hello", (ev) => {
    try {
      const data = JSON.parse(ev.data);
      if (data.state) {
        lang = data.state.lang === "pt-PT" ? "pt-PT" : "en";
        els.langSelect.value = lang;
        if (els.privacySelect) {
          els.privacySelect.value = normalizePrivacyMode(data.state.privacyMode);
        }
        applyI18n();
        renderState(data.state);
      }
      if (data.listsPath) {
        setListsPathDisplay(data.listsPath, data.listsMtimeMs);
      }
      if (data.debounceMs != null || data.listsPathBasename) {
        showOperatorHint({
          debounceMs: data.debounceMs,
          listsPathBasename: data.listsPathBasename
        });
      }
    } catch {
      /* ignore */
    }
  });

  es.addEventListener("block", (ev) => {
    try {
      const data = JSON.parse(ev.data);
      const entry = data.payload?.entry;
      const snap = data.payload?.state;
      // Lifetime chips first — do not wait for full log re-render.
      if (snap) {
        currentState = snap;
        updateLifetimeChip(els.logFilterTrackerLife, snap.totalTrackersBlocked);
        updateLifetimeChip(els.logFilterPhishingLife, snap.totalPhishingBlocked);
      }
      if (entry?.kind) showToast(entry.kind);
      if (snap) renderState(snap);
    } catch {
      /* ignore */
    }
  });

  es.addEventListener("scan", (ev) => {
    try {
      const data = JSON.parse(ev.data);
      const snap = data.payload;
      if (snap) {
        currentState = snap;
        updateLifetimeChip(els.logFilterTrackerLife, snap.totalTrackersBlocked);
        updateLifetimeChip(els.logFilterPhishingLife, snap.totalPhishingBlocked);
        renderState(snap);
      }
    } catch {
      /* ignore */
    }
  });

  es.addEventListener("prefs", (ev) => {
    try {
      const data = JSON.parse(ev.data);
      if (data.payload) {
        if (els.privacySelect) {
          els.privacySelect.value = normalizePrivacyMode(data.payload.privacyMode);
        }
        renderState(data.payload);
      }
    } catch {
      /* ignore */
    }
  });

  es.addEventListener("lists", (ev) => {
    try {
      const data = JSON.parse(ev.data);
      const payload = data.payload || data;
      if (payload.lists) renderLists(payload.lists);
      if (payload.path) setListsPathDisplay(payload.path, payload.mtimeMs);
      setListsStatus(t(lang, "listsReloaded"));
    } catch {
      /* ignore */
    }
  });

  es.onerror = () => {
    // Browser auto-reconnects; no UX block.
  };
}

document.getElementById("checkForm").addEventListener("submit", (event) => {
  event.preventDefault();
  runScan().catch(console.debug);
});

els.websiteHealthBtn?.addEventListener("click", () => {
  probeWebsiteHealth().catch(console.debug);
});

els.websiteCheckBtn?.addEventListener("click", () => {
  runWebsiteCheck().catch(console.debug);
});

els.langSelect.addEventListener("change", async () => {
  lang = els.langSelect.value === "pt-PT" ? "pt-PT" : "en";
  applyI18n();
  const res = await fetch("/api/prefs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lang })
  });
  const data = await res.json();
  if (data.ok) renderState(data.state);
  else if (currentState) renderState(currentState);
});

els.privacySelect?.addEventListener("change", async () => {
  const privacyMode = normalizePrivacyMode(els.privacySelect.value);
  els.privacySelect.value = privacyMode;
  let clearLists = false;
  if (privacyMode === "off") {
    clearLists = window.confirm(t(lang, "listsClearConfirm"));
    clearPersistedScanResources();
  }
  const res = await fetch("/api/prefs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ privacyMode, clearLists })
  });
  const data = await res.json();
  if (data.ok) {
    renderState(data.state);
    if (privacyMode !== "off") restorePersistedScanResources();
    if (data.listsCleared) {
      renderLists({ blocked: [], trusted: [] });
      setListsStatus(t(lang, "listsCleared"));
    }
  } else if (currentState) renderState(currentState);
});

els.listAddForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const domain = els.listDomain?.value?.trim();
  if (!domain) return;
  const res = await fetch("/api/lists/block", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain })
  }).then((r) => r.json());
  if (res?.ok) {
    if (els.listDomain) els.listDomain.value = "";
    renderLists(res.lists);
    setListsStatus(t(lang, "listsSaved"));
  } else {
    setListsStatus(res?.error || t(lang, "listsNeedLocal"));
  }
});

els.listTrustBtn?.addEventListener("click", async () => {
  const domain = els.listDomain?.value?.trim();
  if (!domain) return;
  const res = await fetch("/api/lists/trust", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain })
  }).then((r) => r.json());
  if (res?.ok) {
    if (els.listDomain) els.listDomain.value = "";
    renderLists(res.lists);
    setListsStatus(t(lang, "listsSaved"));
  } else {
    setListsStatus(res?.error || t(lang, "listsNeedLocal"));
  }
});

els.listsExportBtn?.addEventListener("click", async () => {
  const res = await fetch("/api/lists/export");
  if (!res.ok) return;
  const text = await res.text();
  const blob = new Blob([text], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const cd = res.headers.get("Content-Disposition") || "";
  const match = /filename="([^"]+)"/.exec(cd);
  a.download = match?.[1] || `shield-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  setListsStatus(t(lang, "listsExported"));
});

els.listsCopyPathBtn?.addEventListener("click", async () => {
  const pathText = listsFilePath;
  if (!pathText) {
    await refreshLists();
  }
  const value = listsFilePath;
  if (!value) {
    setListsStatus(t(lang, "listsCopyPathFail"));
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    setListsStatus(t(lang, "listsCopyPathOk"));
  } catch {
    setListsStatus(t(lang, "listsCopyPathFail"));
  }
});

els.listsRevealBtn?.addEventListener("click", async () => {
  const res = await fetch("/api/lists/reveal", { method: "POST" }).then((r) => r.json());
  if (res?.ok) {
    setListsStatus(t(lang, "listsRevealOk"));
    return;
  }
  const path = res?.path || listsFilePath;
  if (path) {
    try {
      await navigator.clipboard.writeText(path);
    } catch {
      /* ignore */
    }
  }
  setListsStatus(t(lang, "listsRevealDeferred"));
});

document.querySelectorAll(".log-filter").forEach((btn) => {
  btn.classList.toggle("is-active", btn.getAttribute("data-filter") === logFilter);
  btn.addEventListener("click", () => {
    logFilter = btn.getAttribute("data-filter") || "all";
    try {
      sessionStorage.setItem(LOG_FILTER_KEY, logFilter);
    } catch {
      /* ignore */
    }
    document.querySelectorAll(".log-filter").forEach((el) => {
      el.classList.toggle("is-active", el === btn);
    });
    renderLog(lastBlocks);
  });
});

/** Clear ring-buffer badges / log view only — lifetime Σ chips stay from currentState. */
els.logFilterReset?.addEventListener("click", () => {
  const tip = t(lang, "logFilterLifeTitle");
  const cleared = afterRingClear(currentState?.totalTrackersBlocked, tip);
  renderLog(cleared.ringBlocks);
  // Re-apply lifetime from session totals (renderLog already does via updatePersonalBadge).
  updateLifetimeChip(els.logFilterTrackerLife, currentState?.totalTrackersBlocked);
  updateLifetimeChip(els.logFilterPhishingLife, currentState?.totalPhishingBlocked);
});

els.listsImportBtn?.addEventListener("click", () => {
  els.listsImportFile?.click();
});

els.listsImportFile?.addEventListener("change", async () => {
  const file = els.listsImportFile?.files?.[0];
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    const res = await fetch("/api/lists/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backup })
    }).then((r) => r.json());
    if (res?.ok) {
      renderLists(res.lists);
      const over = globalThis.ShieldQr && !globalThis.ShieldQr.listsFitQrCanvas?.(res.lists);
      if (over && els.listsQrWrap) els.listsQrWrap.hidden = true;
      setListsStatus(
        over
          ? `${t(lang, "listsImported")} ${t(lang, "listsQrTooBig", {
              limit: globalThis.ShieldQr?.QR_HOST_LIMIT || 40
            })}`
          : t(lang, "listsImported")
      );
    } else {
      setListsStatus(res?.error || "import-failed");
    }
  } catch (err) {
    setListsStatus(err instanceof Error ? err.message : "import-failed");
  }
  if (els.listsImportFile) els.listsImportFile.value = "";
});

async function drawListsQr() {
  const zlib = Boolean(els.listsQrZlib?.checked);
  const qs = zlib ? "?zlib=1&both=1" : "?both=1";
  const [qrRes, listRes] = await Promise.all([
    fetch(`/api/lists/qr${qs}`).then((r) => r.json()),
    fetch("/api/lists").then((r) => r.json())
  ]);
  if (!qrRes?.ok || !qrRes.compact) {
    setListsStatus(t(lang, "listsQrFail"));
    return;
  }
  lastQrCompact = qrRes.compact;
  const lists = listRes?.lists || { blocked: [], trusted: [] };
  if (!globalThis.ShieldQr?.listsFitQrCanvas?.(lists)) {
    if (els.listsQrWrap) els.listsQrWrap.hidden = true;
    setListsStatus(t(lang, "listsQrTooBig", { limit: globalThis.ShieldQr?.QR_HOST_LIMIT || 40 }));
    return;
  }
  if (!els.listsQrCanvas || !globalThis.ShieldQr?.drawQrToCanvas) {
    setListsStatus(t(lang, "listsQrFail"));
    return;
  }
  globalThis.ShieldQr.drawQrToCanvas(els.listsQrCanvas, qrRes.compact, { width: 180 }, (err) => {
    if (err) {
      setListsStatus(t(lang, "listsQrFail"));
      return;
    }
    if (els.listsQrWrap) els.listsQrWrap.hidden = false;
    if (els.listsQrHint) {
      els.listsQrHint.textContent = zlib ? t(lang, "listsQrShownZlib") : t(lang, "listsQrShown");
    }
    setListsStatus(zlib ? t(lang, "listsQrShownZlib") : t(lang, "listsQrShown"));
  });
}

els.listsQrBtn?.addEventListener("click", () => {
  void drawListsQr();
});

els.listsQrZlib?.addEventListener("change", () => {
  if (els.listsQrWrap && !els.listsQrWrap.hidden) void drawListsQr();
});

els.listsQrCopyBtn?.addEventListener("click", async () => {
  if (!lastQrCompact) return;
  try {
    await navigator.clipboard.writeText(lastQrCompact);
    setListsStatus(t(lang, "listsQrCopied"));
  } catch {
    setListsStatus(t(lang, "listsQrFail"));
  }
});

function setAccountStatus(msg) {
  if (!els.accountStatus) return;
  els.accountStatus.textContent = msg || "";
}

async function refreshAccountUi() {
  try {
    const data = await fetch("/api/account").then((r) => r.json());
    if (!data?.ok) return;
    if (els.accountSyncToggle) els.accountSyncToggle.checked = data.syncEnabled === true;
    if (els.accountEmail && data.email) els.accountEmail.value = data.email;
    let status =
      data.signedIn && data.email
        ? t(lang, "accountSignedIn", { email: data.email })
        : t(lang, "accountSignedOut");
    if (data.lastSyncError) {
      status = `${status} · ${t(lang, "accountSyncFail", { error: data.lastSyncError })}`;
    }
    setAccountStatus(status);
  } catch {
    setAccountStatus(t(lang, "accountSignedOut"));
  }
}

els.accountSignInForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = (els.accountEmail?.value || "").trim();
  if (!email) return;
  try {
    const res = await fetch("/api/account/magic/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    }).then((r) => r.json());
    if (!res?.ok) {
      setAccountStatus(
        res?.error === "account-sync-disabled"
          ? t(lang, "accountDisabled")
          : t(lang, "accountSyncFail", { error: res?.error || "fail" })
      );
      return;
    }
    setAccountStatus(t(lang, "accountMagicSent"));
    if (res.devLink) {
      try {
        window.open(res.devLink, "_blank", "noopener");
      } catch {
        /* ignore */
      }
    }
  } catch (err) {
    setAccountStatus(t(lang, "accountSyncFail", { error: err instanceof Error ? err.message : "fail" }));
  }
});

els.accountExchangeBtn?.addEventListener("click", async () => {
  const deviceCode = (els.accountDeviceCode?.value || "").trim();
  if (!deviceCode) return;
  try {
    const res = await fetch("/api/account/device/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceCode })
    }).then((r) => r.json());
    if (!res?.ok) {
      setAccountStatus(t(lang, "accountSyncFail", { error: res?.error || "fail" }));
      return;
    }
    await refreshAccountUi();
  } catch (err) {
    setAccountStatus(t(lang, "accountSyncFail", { error: err instanceof Error ? err.message : "fail" }));
  }
});

els.accountSyncToggle?.addEventListener("change", async () => {
  const syncEnabled = els.accountSyncToggle?.checked === true;
  await fetch("/api/account/prefs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ syncEnabled })
  });
});

els.accountSignOutBtn?.addEventListener("click", async () => {
  await fetch("/api/account/logout", { method: "POST" });
  await refreshAccountUi();
});

els.accountSyncNowBtn?.addEventListener("click", async () => {
  try {
    const res = await fetch("/api/account/sync", { method: "POST" }).then((r) => r.json());
    if (!res?.ok) {
      setAccountStatus(t(lang, "accountSyncFail", { error: res?.error || "fail" }));
      return;
    }
    if (res.lists) renderLists(res.lists);
    setAccountStatus(res.merged ? t(lang, "accountSyncMerged") : t(lang, "accountSyncOk"));
  } catch (err) {
    setAccountStatus(t(lang, "accountSyncFail", { error: err instanceof Error ? err.message : "fail" }));
  }
});

fetchState()
  .then(() => {
    connectSSE();
    void refreshLists();
    void refreshAccountUi();
    void probeWebsiteHealth();
    window.setInterval(() => {
      void probeWebsiteHealth({ silent: true });
    }, websiteHealthPollMs);
  })
  .catch((err) => console.debug("[dashboard] init failed", err));