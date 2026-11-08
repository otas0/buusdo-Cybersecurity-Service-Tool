/**
 * Desktop dashboard controller — Ookla-style Scan UI + live SSE block feed.
 */

import { normalizeUiLang, t } from "./i18n.js";
import { LOCALE_CATALOG_DATA } from "./locale-catalog.js";
import { afterRingClear, lifetimeChipTitles } from "./lifetime-chip.mjs";
import { hashFocusOnlyScrolls, shouldFocusAskDecline } from "./machine-focus.mjs";
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
  resultDangerLevel: document.getElementById("resultDangerLevel"),
  resultIgnoreRisk: document.getElementById("resultIgnoreRisk"),
  resultIgnoreRiskTitle: document.getElementById("resultIgnoreRiskTitle"),
  resultIgnoreRiskBody: document.getElementById("resultIgnoreRiskBody"),
  trackersLabel: document.getElementById("trackersLabel"),
  phishingLabel: document.getElementById("phishingLabel"),
  trackersValue: document.getElementById("trackersValue"),
  phishingValue: document.getElementById("phishingValue"),
  lastScanLabel: document.getElementById("lastScanLabel"),
  lastScanValue: document.getElementById("lastScanValue"),
  privacyLabel: document.getElementById("privacyLabel"),
  privacySelect: document.getElementById("privacySelect"),
  openAtLogin: document.getElementById("openAtLogin"),
  openAtLoginLabel: document.getElementById("openAtLoginLabel"),
  quitApp: document.getElementById("quitApp"),
  privacyHint: document.getElementById("privacyHint"),
  dataDirHint: document.getElementById("dataDirHint"),
  dataDirCopy: document.getElementById("dataDirCopy"),
  trayHint: document.getElementById("trayHint"),
  footAboutText: document.getElementById("footAboutText"),
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
  websiteBlockOnDevice: document.getElementById("websiteBlockOnDevice"),
  pathScanMachine: document.getElementById("pathScanMachine"),
  pathCheckWeb: document.getElementById("pathCheckWeb"),
  threatSummaryTitle: document.getElementById("threatSummaryTitle"),
  threatSummaryHint: document.getElementById("threatSummaryHint"),
  threatMachineTitle: document.getElementById("threatMachineTitle"),
  threatWebTitle: document.getElementById("threatWebTitle"),
  threatMachineList: document.getElementById("threatMachineList"),
  threatWebList: document.getElementById("threatWebList"),
  proxyQuietBanner: document.getElementById("proxyQuietBanner"),
  updateCheckBtn: document.getElementById("updateCheckBtn"),
  updateCheckStatus: document.getElementById("updateCheckStatus"),
  proxyBody: document.getElementById("proxyBody"),
  proxyGuide: document.getElementById("proxyGuide"),
  proxyGuideShow: document.getElementById("proxyGuideShow"),
  proxyGuideSummary: document.getElementById("proxyGuideSummary"),
  proxyGuideLead: document.getElementById("proxyGuideLead"),
  proxyGuideMacDetails: document.getElementById("proxyGuideMacDetails"),
  proxyGuideWinDetails: document.getElementById("proxyGuideWinDetails"),
  proxyGuideLinuxDetails: document.getElementById("proxyGuideLinuxDetails"),
  proxyGuideMacSummary: document.getElementById("proxyGuideMacSummary"),
  proxyGuideWinSummary: document.getElementById("proxyGuideWinSummary"),
  proxyGuideLinuxSummary: document.getElementById("proxyGuideLinuxSummary"),
  proxyGuideMac: document.getElementById("proxyGuideMac"),
  proxyGuideWin: document.getElementById("proxyGuideWin"),
  proxyGuideLinux: document.getElementById("proxyGuideLinux"),
  proxyGuideBrowser: document.getElementById("proxyGuideBrowser"),
  proxyGuideCurl: document.getElementById("proxyGuideCurl"),
  proxyMacSetBtn: document.getElementById("proxyMacSetBtn"),
  proxyMacClearBtn: document.getElementById("proxyMacClearBtn"),
  proxyMacSetHonest: document.getElementById("proxyMacSetHonest"),
  proxyMacSetStatus: document.getElementById("proxyMacSetStatus"),
  updateCheckDownload: document.getElementById("updateCheckDownload"),
  honestLimitsGate: document.getElementById("honestLimitsGate"),
  honestLimitsKicker: document.getElementById("honestLimitsKicker"),
  honestLimitsTitle: document.getElementById("honestLimitsTitle"),
  honestLimitsBody: document.getElementById("honestLimitsBody"),
  honestLimitsItemTls: document.getElementById("honestLimitsItemTls"),
  honestLimitsItemKill: document.getElementById("honestLimitsItemKill"),
  honestLimitsItemSystem: document.getElementById("honestLimitsItemSystem"),
  honestLimitsItemAv: document.getElementById("honestLimitsItemAv"),
  honestLimitsAck: document.getElementById("honestLimitsAck"),
  honestLimitsSkip: document.getElementById("honestLimitsSkip"),
  honestLimitsReset: document.getElementById("honestLimitsReset"),
  diagnosticsExport: document.getElementById("diagnosticsExport"),
  diagnosticsCopyPath: document.getElementById("diagnosticsCopyPath"),
  diagnosticsReveal: document.getElementById("diagnosticsReveal"),
  diagnosticsExportStatus: document.getElementById("diagnosticsExportStatus"),
  toastHost: document.getElementById("toastHost"),
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
  listAddForm: document.getElementById("listAddForm"),
  machineKicker: document.getElementById("machineKicker"),
  machineStatus: document.getElementById("machineStatus"),
  machineScope: document.getElementById("machineScope"),
  machineCoverage: document.getElementById("machineCoverage"),
  machineTrusted: document.getElementById("machineTrusted"),
  machineOpenTitle: document.getElementById("machineOpenTitle"),
  machineSettledTitle: document.getElementById("machineSettledTitle"),
  machineOpen: document.getElementById("machineOpen"),
  machineSettled: document.getElementById("machineSettled"),
  machineQuarantineTitle: document.getElementById("machineQuarantineTitle"),
  machineQuarantine: document.getElementById("machineQuarantine"),
  machineRescan: document.getElementById("machineRescan"),
  machineRescanPrimaryHint: document.getElementById("machineRescanPrimaryHint"),
  machineContinue: document.getElementById("machineContinue"),
  machineBlockAgain: document.getElementById("machineBlockAgain"),
  machineRestore: document.getElementById("machineRestore"),
  machineAsk: document.getElementById("machineAsk"),
  machineAskKicker: document.getElementById("machineAskKicker"),
  machineAskTitle: document.getElementById("machineAskTitle"),
  machineAskBody: document.getElementById("machineAskBody"),
  machineAskList: document.getElementById("machineAskList"),
  machineBlockMax: document.getElementById("machineBlockMax"),
  machineDecline: document.getElementById("machineDecline")
};

/** @type {string|null} */
let listsFilePath = null;
/** @type {string|null} */
let dataDirPath = null;
/** @type {string|null} */
let lastQrCompact = null;
/** @type {string|null} */
let diagnosticsExportPath = null;
/** @type {string} */
let hostPlatform = "darwin";
/** Honest-limits skip → promote Scan again as primary CTA (until scan leaves idle). */
let honestLimitsSkipped = false;
/** Hostname-only recent website checks (never full URL). */
const RECENT_WEB_KEY = "shieldRecentWebChecks";
/** @type {Array<{host:string,level:string,at:string}>} */
let recentWebChecks = (() => {
  try {
    const raw = sessionStorage.getItem(RECENT_WEB_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
})();
/** Last website-check hostname for Block on this device. */
let lastWebsiteCheckHost = null;
let personalBlockCountSession = 0;
let proxyGuideOsOpened = false;
const PROXY_GUIDE_CLOSED_KEY = "shieldProxyGuideUserClosed";
/** User closed outer proxy guide — do not reopen on lang / state refresh / reload. */
let proxyGuideUserClosed = (() => {
  try {
    return sessionStorage.getItem(PROXY_GUIDE_CLOSED_KEY) === "1";
  } catch {
    return false;
  }
})();
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

/** @type {string} */
let lang = "en";

function fillLangSelect() {
  const sel = els.langSelect;
  if (!sel || !LOCALE_CATALOG_DATA?.catalog) return;
  const { regionOrder, regionLabels, catalog } = LOCALE_CATALOG_DATA;
  const previous = sel.value || lang;
  sel.innerHTML = "";
  for (const region of regionOrder) {
    const items = catalog.filter((c) => c.region === region);
    if (!items.length) continue;
    const group = document.createElement("optgroup");
    group.label = regionLabels?.[region]?.en || region;
    for (const item of items) {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.nativeName;
      group.appendChild(opt);
    }
    sel.appendChild(group);
  }
  sel.value = previous;
}
/** Desktop package version from /api/state (footer about line). */
let desktopAppVersion = "";
/** @type {object|null} */
let currentState = null;
/** @type {object|null} */
let lastMachine = null;
/** @type {boolean} */
let machineAskOpen = false;
/** @type {ReturnType<typeof setInterval>|null} */
let machinePollTimer = null;
/** @type {{ debounceMs?: number, listsPathBasename?: string } | null} */
let lastOperatorHint = null;

function applyI18n() {
  const titleHidden = els.appTitle?.querySelector?.(".visually-hidden");
  if (titleHidden) titleHidden.textContent = t(lang, "appTitle");
  else if (els.appTitle && !els.appTitle.querySelector?.("img")) {
    els.appTitle.textContent = t(lang, "appTitle");
  }
  if (typeof document !== "undefined") document.title = t(lang, "appTitle");
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
  if (els.openAtLoginLabel) els.openAtLoginLabel.textContent = t(lang, "openAtLogin");
  if (els.quitApp) els.quitApp.textContent = t(lang, "quitApp");
  if (els.dataDirHint && dataDirPath) {
    els.dataDirHint.textContent = t(lang, "dataDirHint", { path: dataDirPath });
  }
  if (els.dataDirCopy) {
    els.dataDirCopy.textContent = t(lang, "dataDirCopy");
    els.dataDirCopy.hidden = !dataDirPath;
  }
  if (els.trayHint && !els.trayHint.hidden) {
    els.trayHint.textContent = t(lang, "trayHintMissing");
  }
  if (els.footAboutText) {
    els.footAboutText.textContent = desktopAppVersion
      ? t(lang, "footAboutVersion", { version: desktopAppVersion })
      : t(lang, "footAbout");
  }
  const footPoster = document.getElementById("footA4Poster");
  if (footPoster) {
    footPoster.textContent = t(lang, "footA4Poster") || "A4 poster";
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
  if (els.websiteBlockOnDevice) els.websiteBlockOnDevice.textContent = t(lang, "websiteBlockOnDevice");
  if (els.pathScanMachine) els.pathScanMachine.textContent = t(lang, "pathScanMachine");
  if (els.pathCheckWeb) els.pathCheckWeb.textContent = t(lang, "pathCheckWeb");
  if (els.threatSummaryTitle) els.threatSummaryTitle.textContent = t(lang, "threatSummaryTitle");
  if (els.threatSummaryHint) els.threatSummaryHint.textContent = t(lang, "threatSummaryHint");
  if (els.threatMachineTitle) els.threatMachineTitle.textContent = t(lang, "threatMachineTitle");
  if (els.threatWebTitle) els.threatWebTitle.textContent = t(lang, "threatWebTitle");
  if (els.updateCheckBtn) els.updateCheckBtn.textContent = t(lang, "updateCheck");
  if (els.proxyQuietBanner && !els.proxyQuietBanner.hidden) {
    els.proxyQuietBanner.textContent = t(lang, "proxyQuietBanner");
  }
  renderThreatSummary();
  els.proxyBody.textContent = t(lang, "proxyBody");
  if (els.proxyGuideSummary) els.proxyGuideSummary.textContent = t(lang, "proxyGuideSummary");
  if (els.proxyGuideShow) els.proxyGuideShow.textContent = t(lang, "proxyGuideShow");
  if (els.proxyGuideLead) els.proxyGuideLead.textContent = t(lang, "proxyGuideLead");
  if (els.proxyGuideMacSummary) els.proxyGuideMacSummary.textContent = t(lang, "proxyGuideMacSummary");
  if (els.proxyGuideWinSummary) els.proxyGuideWinSummary.textContent = t(lang, "proxyGuideWinSummary");
  if (els.proxyGuideLinuxSummary) els.proxyGuideLinuxSummary.textContent = t(lang, "proxyGuideLinuxSummary");
  if (els.proxyGuideMac) els.proxyGuideMac.textContent = t(lang, "proxyGuideMac");
  if (els.proxyGuideWin) els.proxyGuideWin.textContent = t(lang, "proxyGuideWin");
  if (els.proxyGuideLinux) els.proxyGuideLinux.textContent = t(lang, "proxyGuideLinux");
  if (els.proxyGuideBrowser) els.proxyGuideBrowser.textContent = t(lang, "proxyGuideBrowser");
  if (els.proxyGuideCurl) els.proxyGuideCurl.textContent = t(lang, "proxyGuideCurl");
  if (els.proxyMacSetHonest) els.proxyMacSetHonest.textContent = t(lang, "proxyMacSetHonest");
  if (els.proxyMacSetBtn) {
    els.proxyMacSetBtn.textContent = t(lang, "proxyMacSet");
    els.proxyMacSetBtn.hidden = hostPlatform !== "darwin";
  }
  if (els.proxyMacClearBtn) {
    els.proxyMacClearBtn.textContent = t(lang, "proxyMacClear");
    els.proxyMacClearBtn.hidden = hostPlatform !== "darwin";
  }
  if (els.honestLimitsKicker) els.honestLimitsKicker.textContent = t(lang, "honestLimitsKicker");
  if (els.honestLimitsTitle) els.honestLimitsTitle.textContent = t(lang, "honestLimitsTitle");
  if (els.honestLimitsBody) els.honestLimitsBody.textContent = t(lang, "honestLimitsBody");
  if (els.honestLimitsItemTls) els.honestLimitsItemTls.textContent = t(lang, "honestLimitsItemTls");
  if (els.honestLimitsItemKill) els.honestLimitsItemKill.textContent = t(lang, "honestLimitsItemKill");
  if (els.honestLimitsItemSystem) els.honestLimitsItemSystem.textContent = t(lang, "honestLimitsItemSystem");
  if (els.honestLimitsItemAv) els.honestLimitsItemAv.textContent = t(lang, "honestLimitsItemAv");
  if (els.honestLimitsAck) els.honestLimitsAck.textContent = t(lang, "honestLimitsAck");
  if (els.honestLimitsSkip) els.honestLimitsSkip.textContent = t(lang, "honestLimitsSkip");
  if (els.honestLimitsReset) els.honestLimitsReset.textContent = t(lang, "honestLimitsReset");
  if (els.diagnosticsExport) els.diagnosticsExport.textContent = t(lang, "diagnosticsExport");
  if (els.diagnosticsCopyPath) els.diagnosticsCopyPath.textContent = t(lang, "diagnosticsCopyPath");
  if (els.diagnosticsReveal) els.diagnosticsReveal.textContent = t(lang, "diagnosticsReveal");
  syncDiagnosticsExportStyle();
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
  if (els.machineKicker) els.machineKicker.textContent = t(lang, "machineKicker");
  if (els.machineAskKicker) els.machineAskKicker.textContent = t(lang, "machineKicker");
  if (els.machineScope) els.machineScope.textContent = t(lang, "machineScope");
  if (els.machineOpenTitle) els.machineOpenTitle.textContent = t(lang, "machineOpenTitle");
  if (els.machineSettledTitle) els.machineSettledTitle.textContent = t(lang, "machineSettledTitle");
  if (els.machineQuarantineTitle) els.machineQuarantineTitle.textContent = t(lang, "machineQuarantineTitle");
  if (els.machineRescan) els.machineRescan.textContent = t(lang, "machineRescan");
  if (els.machineRescanPrimaryHint) {
    els.machineRescanPrimaryHint.textContent = t(lang, "machineRescanPrimaryHint");
  }
  if (els.machineContinue) els.machineContinue.textContent = t(lang, "machineContinue");
  if (els.machineBlockAgain) els.machineBlockAgain.textContent = t(lang, "machineBlockMax");
  if (els.machineRestore) els.machineRestore.textContent = t(lang, "machineRestore");
  if (els.machineAskTitle) els.machineAskTitle.textContent = t(lang, "machineAskTitle");
  if (els.machineBlockMax) els.machineBlockMax.textContent = t(lang, "machineBlockMax");
  if (els.machineDecline) els.machineDecline.textContent = t(lang, "machineDecline");
  if (lastMachine) renderMachine(lastMachine);
  if (els.listsOperatorHint && !els.listsOperatorHint.hidden && lastOperatorHint) {
    els.listsOperatorHint.textContent = formatOperatorHint(lastOperatorHint);
  }
  document.documentElement.lang =
    lang || "en";
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

function setHaltSurveyBlocks(show) {
  if (els.resultDangerLevel) {
    if (show) {
      els.resultDangerLevel.hidden = false;
      els.resultDangerLevel.textContent = `${t(lang, "dangerLevelLabel")}: ${t(lang, "statusDanger")}`;
    } else {
      els.resultDangerLevel.hidden = true;
      els.resultDangerLevel.textContent = "";
    }
  }
  if (els.resultIgnoreRisk) {
    els.resultIgnoreRisk.hidden = !show;
    if (els.resultIgnoreRiskTitle) els.resultIgnoreRiskTitle.textContent = t(lang, "ignoreRiskTitle");
    if (els.resultIgnoreRiskBody) els.resultIgnoreRiskBody.textContent = t(lang, "ignoreRiskBody");
  }
}

function setReadout(level) {
  const shown = level === "idle" ? "idle" : level;
  els.readout.dataset.level = shown;
  els.statusWord.textContent = wordFor(shown);
  setHaltSurveyBlocks(shown === "danger");
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
  updateProxyQuietBanner();
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

function renderActivity(snap) {
  currentState = snap;
  els.trackersValue.textContent = String(snap.totalTrackersBlocked ?? 0);
  els.phishingValue.textContent = String(snap.totalPhishingBlocked ?? 0);
  renderLog(snap.recentBlocks);
}

function renderState(snap) {
  renderActivity(snap);
  const level = snap.lastScan?.level || "idle";
  setReadout(level);

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
  lang = normalizeUiLang(data.state.lang);
  els.langSelect.value = lang;
  if (els.privacySelect) {
    els.privacySelect.value = normalizePrivacyMode(data.state.privacyMode);
  }
  if (els.openAtLogin) {
    els.openAtLogin.checked = data.settings?.openAtLogin === true;
  }
  if (typeof data.platform === "string" && data.platform) {
    hostPlatform = data.platform;
  }
  honestLimitsSkipped = Boolean(data.settings?.honestLimitsSkippedAt);
  syncHonestLimitsGate(Boolean(data.honestLimitsPending));
  syncDiagnosticsExportStyle();
  openProxyGuideForPlatform(hostPlatform);
  if (data.dataDir) {
    dataDirPath = data.dataDir;
    if (els.dataDirHint) els.dataDirHint.textContent = t(lang, "dataDirHint", { path: dataDirPath });
    if (els.dataDirCopy) {
      els.dataDirCopy.hidden = false;
      els.dataDirCopy.textContent = t(lang, "dataDirCopy");
    }
  }
  if (els.trayHint) {
    const missing = data.trayAvailable === false;
    els.trayHint.hidden = !missing;
    if (missing) els.trayHint.textContent = t(lang, "trayHintMissing");
  }
  if (typeof data.version === "string" && data.version) {
    desktopAppVersion = data.version;
  }
  if (els.footAboutText) {
    els.footAboutText.textContent = desktopAppVersion
      ? t(lang, "footAboutVersion", { version: desktopAppVersion })
      : t(lang, "footAbout");
  }
  {
    const footPoster = document.getElementById("footA4Poster");
    if (footPoster) footPoster.textContent = t(lang, "footA4Poster") || "A4 poster";
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
    const host = String(data.analysis.parsed?.hostname || data.analysis.parsed?.registrableDomain || "")
      .toLowerCase()
      .replace(/\.$/, "");
    lastWebsiteCheckHost = host || null;
    if (els.websiteBlockOnDevice) els.websiteBlockOnDevice.hidden = !host;
    if (host) rememberWebCheck(host, level);
    const readout = riskLevelToReadout(level);
    setReadout(readout);
    if (readout === "danger") els.statusDetail.textContent = t(lang, "detailDanger");
    else if (readout === "caution") els.statusDetail.textContent = t(lang, "detailCaution");
    else if (readout === "safe") els.statusDetail.textContent = t(lang, "detailSafe");
    els.websiteCheckStatus.textContent = t(lang, "websiteCheckOk", {
      level,
      total: total == null ? "—" : String(total)
    });
    renderThreatSummary();
  } catch (err) {
    const message = err instanceof Error ? err.message : "unreachable";
    els.websiteCheckStatus.textContent = `${t(lang, "websiteCheckFail", { error: message })} ${t(lang, "websiteCheckHintDev")}`;
  } finally {
    els.websiteCheckBtn.disabled = !websiteReachable;
  }
}

function rememberWebCheck(host, level) {
  const privacyOff = currentPrivacyMode() === "off";
  // Never store mode: keep only in-memory for this page session (no sessionStorage).
  const row = { host, level: String(level || "?"), at: new Date().toISOString() };
  recentWebChecks = [row, ...recentWebChecks.filter((r) => r.host !== host)].slice(0, 8);
  if (!privacyOff) {
    try {
      sessionStorage.setItem(RECENT_WEB_KEY, JSON.stringify(recentWebChecks));
    } catch {
      /* ignore */
    }
  } else {
    try {
      sessionStorage.removeItem(RECENT_WEB_KEY);
    } catch {
      /* ignore */
    }
  }
}

function showMessageToast(message, kind = "caution", opts = {}) {
  if (!els.toastHost) return;
  const el = document.createElement("div");
  el.className = `toast ${kind === "danger" ? "toast-danger" : "toast-caution"}`;
  el.textContent = message;
  if (opts.testId) el.dataset.testid = opts.testId;
  els.toastHost.appendChild(el);
  requestAnimationFrame(() => el.classList.add("is-visible"));
  setTimeout(() => {
    el.classList.remove("is-visible");
    setTimeout(() => el.remove(), 250);
  }, 3200);
}

function forceProxyGuideOpen(reasonKey) {
  if (els.proxyQuietBanner) {
    els.proxyQuietBanner.hidden = false;
    els.proxyQuietBanner.textContent = t(lang, reasonKey || "proxyQuietBanner");
  }
  persistProxyGuideUserClosed(false);
  if (els.proxyGuide) els.proxyGuide.open = true;
  syncProxyGuideShowButton();
  els.proxyGuide?.scrollIntoView({ block: "nearest" });
}

function updateProxyQuietBanner() {
  if (!els.proxyQuietBanner) return;
  const quiet = personalBlockCountSession > 0 && (!lastBlocks || lastBlocks.length === 0);
  if (quiet) {
    els.proxyQuietBanner.hidden = false;
    els.proxyQuietBanner.textContent = t(lang, "proxyQuietBanner");
  }
}

async function blockHostOnDevice(host) {
  const domain = String(host || "").trim().toLowerCase();
  if (!domain) return false;
  const res = await fetch("/api/lists/block", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain, reason: "website-check" })
  }).then((r) => r.json());
  if (!res?.ok) return false;
  personalBlockCountSession += 1;
  if (res.lists) renderLists(res.lists);
  forceProxyGuideOpen("proxyGuideAfterBlock");
  updateProxyQuietBanner();
  return true;
}

function renderThreatSummary() {
  const machineHosts = [];
  const seen = new Set();
  for (const item of lastMachine?.openFindings || []) {
    if (item?.enforceable === "block-host" && item.host && !seen.has(item.host)) {
      seen.add(item.host);
      machineHosts.push(item.host);
    }
  }
  for (const item of lastMachine?.settledFindings || []) {
    if (item?.host && !seen.has(item.host)) {
      seen.add(item.host);
      machineHosts.push(item.host);
    }
  }
  fillTextList(
    els.threatMachineList,
    machineHosts.slice(0, 8).map((host) => ({
      text: host,
      host,
      checkWeb: true
    })),
    t(lang, "threatSummaryEmpty")
  );
  fillTextList(
    els.threatWebList,
    recentWebChecks.map((row) => ({
      text: t(lang, "threatWebRow", { host: row.host, level: row.level }),
      host: row.host,
      checkWeb: true
    })),
    t(lang, "threatSummaryEmpty")
  );
}

/** @type {EventSource|null} */
let eventSource = null;
let sseQuitting = false;

function disconnectSSE() {
  sseQuitting = true;
  if (eventSource) {
    try {
      eventSource.close();
    } catch {
      /* ignore */
    }
    eventSource = null;
  }
}

function connectSSE() {
  disconnectSSE();
  sseQuitting = false;
  const es = new EventSource("/api/events");
  eventSource = es;

  es.addEventListener("hello", (ev) => {
    try {
      const data = JSON.parse(ev.data);
      if (data.state) {
        lang = normalizeUiLang(data.state.lang);
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
      if (snap) renderActivity(snap);
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

  es.addEventListener("machine", (ev) => {
    try {
      const data = JSON.parse(ev.data);
      const view = data.payload || data;
      if (view && view.status) renderMachine(view);
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

  es.addEventListener("bye", () => {
    disconnectSSE();
  });

  es.onerror = () => {
    if (sseQuitting) {
      try {
        es.close();
      } catch {
        /* ignore */
      }
      eventSource = null;
      return;
    }
    // Browser auto-reconnects while the process is still up.
  };
}

function focusMachineScanHash() {
  document.getElementById("machineScan")?.scrollIntoView({ block: "start" });
  const askVisible = Boolean(els.machineAsk && !els.machineAsk.hidden);
  if (hashFocusOnlyScrolls({ askVisible, alreadyOpen: machineAskOpen })) return;
}

if (typeof location !== "undefined" && location.hash === "#machineScan") {
  requestAnimationFrame(() => focusMachineScanHash());
}
window.addEventListener("hashchange", () => {
  if (location.hash === "#machineScan") focusMachineScanHash();
});

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

fillLangSelect();

els.langSelect.addEventListener("change", async () => {
  lang = normalizeUiLang(els.langSelect.value);
  document.documentElement.lang = lang;
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

els.openAtLogin?.addEventListener("change", async () => {
  const openAtLogin = Boolean(els.openAtLogin.checked);
  try {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openAtLogin })
    });
    const data = await res.json();
    if (!data?.ok) {
      els.openAtLogin.checked = false;
      showToast("error");
      return;
    }
    els.openAtLogin.checked = data.settings?.openAtLogin === true;
  } catch {
    els.openAtLogin.checked = false;
    showToast("error");
  }
});

els.dataDirCopy?.addEventListener("click", async () => {
  if (!dataDirPath) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(dataDirPath);
      setListsStatus(t(lang, "dataDirCopiedClipboard"));
      return;
    }
    throw new Error("clipboard-unavailable");
  } catch {
    const manual = window.prompt(t(lang, "dataDirHint", { path: dataDirPath }), dataDirPath);
    if (manual != null) setListsStatus(t(lang, "dataDirCopiedPrompt"));
  }
});

els.quitApp?.addEventListener("click", () => {
  disconnectSSE();
  void fetch("/api/quit", { method: "POST" })
    .catch(() => {})
    .finally(() => {
      disconnectSSE();
    });
});

els.privacySelect?.addEventListener("change", async () => {
  const privacyMode = normalizePrivacyMode(els.privacySelect.value);
  els.privacySelect.value = privacyMode;
  syncDiagnosticsExportStyle();
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

els.websiteBlockOnDevice?.addEventListener("click", async () => {
  if (!lastWebsiteCheckHost) {
    showMessageToast(t(lang, "websiteBlockNeedHost"), "danger");
    return;
  }
  const ok = await blockHostOnDevice(lastWebsiteCheckHost);
  if (ok) {
    showMessageToast(t(lang, "websiteBlockedOnDevice", { host: lastWebsiteCheckHost }));
  }
});

els.pathScanMachine?.addEventListener("click", () => {
  document.getElementById("machineScan")?.scrollIntoView({ block: "start" });
  void els.machineRescan?.click();
});

els.pathCheckWeb?.addEventListener("click", () => {
  els.checkUrl?.focus();
  document.getElementById("checkForm")?.scrollIntoView({ block: "center" });
});

els.updateCheckBtn?.addEventListener("click", async () => {
  if (els.updateCheckStatus) els.updateCheckStatus.hidden = false;
  if (els.updateCheckDownload) els.updateCheckDownload.hidden = true;
  try {
    const res = await fetch("/api/update-check").then((r) => r.json());
    if (!res?.ok) {
      if (els.updateCheckStatus) {
        els.updateCheckStatus.textContent = t(lang, "updateCheckFail", { error: res?.error || "fail" });
      }
      return;
    }
    if (els.updateCheckStatus) {
      const headNote = t(lang, "updateCheckNotarizedHead", {
        status: String(res.notarizedHeadStatus ?? (res.notarizedHeadOk ? 200 : "?"))
      });
      const base = res.preferNotarized
        ? t(lang, "updateCheckNotarizedReady", {
            version: res.version || "?",
            tag: res.releaseTag || "?"
          })
        : t(lang, "updateCheckCurrent", {
            version: res.version || "?",
            tag: res.releaseTag || "?"
          });
      els.updateCheckStatus.textContent = `${base} ${headNote}`;
    }
    if (els.updateCheckDownload && res.downloadUrl) {
      els.updateCheckDownload.hidden = false;
      els.updateCheckDownload.href = res.downloadUrl;
      els.updateCheckDownload.textContent = res.preferNotarized
        ? t(lang, "updateCheckDownload")
        : t(lang, "updateCheckDownloadUnsigned");
    }
  } catch (err) {
    if (els.updateCheckStatus) {
      els.updateCheckStatus.textContent = t(lang, "updateCheckFail", {
        error: err instanceof Error ? err.message : "fail"
      });
    }
  }
});

els.proxyMacSetBtn?.addEventListener("click", async () => {
  if (els.proxyMacSetStatus) {
    els.proxyMacSetStatus.hidden = false;
    els.proxyMacSetStatus.textContent = "…";
  }
  try {
    const res = await fetch("/api/proxy/macos-set", { method: "POST" }).then((r) => r.json());
    if (!els.proxyMacSetStatus) return;
    if (res?.ok && res.applied) {
      els.proxyMacSetStatus.textContent = t(lang, "proxyMacSetOk", {
        service: res.service || "Wi-Fi",
        host: res.host || "127.0.0.1",
        port: String(res.port || 8080)
      });
      showMessageToast(els.proxyMacSetStatus.textContent);
      if (els.proxyGuideMacDetails) els.proxyGuideMacDetails.open = true;
      if (els.proxyGuide) els.proxyGuide.open = true;
    } else {
      els.proxyMacSetStatus.textContent = t(lang, "proxyMacSetFail", {
        error: res?.error || res?.note || "denied"
      });
    }
  } catch (err) {
    if (els.proxyMacSetStatus) {
      els.proxyMacSetStatus.textContent = t(lang, "proxyMacSetFail", {
        error: err instanceof Error ? err.message : "fail"
      });
    }
  }
});

els.proxyMacClearBtn?.addEventListener("click", async () => {
  if (els.proxyMacSetStatus) {
    els.proxyMacSetStatus.hidden = false;
    els.proxyMacSetStatus.textContent = "…";
  }
  try {
    const res = await fetch("/api/proxy/macos-clear", { method: "POST" }).then((r) => r.json());
    if (!els.proxyMacSetStatus) return;
    if (res?.ok && res.applied) {
      els.proxyMacSetStatus.textContent = t(lang, "proxyMacClearOk", {
        service: res.service || "Wi-Fi"
      });
      showMessageToast(els.proxyMacSetStatus.textContent);
      if (els.proxyGuideMacDetails) els.proxyGuideMacDetails.open = true;
      if (els.proxyGuide) els.proxyGuide.open = true;
    } else {
      els.proxyMacSetStatus.textContent = t(lang, "proxyMacClearFail", {
        error: res?.error || res?.note || "denied"
      });
    }
  } catch (err) {
    if (els.proxyMacSetStatus) {
      els.proxyMacSetStatus.textContent = t(lang, "proxyMacClearFail", {
        error: err instanceof Error ? err.message : "fail"
      });
    }
  }
});

function fillCheckFromThreatHost(host) {
  if (!host || !els.checkUrl) return;
  els.checkUrl.value = host;
  document.getElementById("checkForm")?.scrollIntoView({ block: "center" });
  els.checkUrl.focus();
}

document.addEventListener("click", (ev) => {
  const btn = ev.target instanceof Element ? ev.target.closest("button.check-on-web") : null;
  if (btn) {
    const host = btn.getAttribute("data-host");
    fillCheckFromThreatHost(host);
    if (!host) return;
    if (websiteReachable) void runWebsiteCheck();
    else
      void probeWebsiteHealth().then(() => {
        if (websiteReachable) void runWebsiteCheck();
      });
    return;
  }
  const threatLi = ev.target instanceof Element ? ev.target.closest("#threatMachineList li, #threatWebList li") : null;
  if (!threatLi) return;
  if (ev.target instanceof Element && ev.target.closest("button")) return;
  const host = threatLi.getAttribute("data-host") || threatLi.querySelector("button.check-on-web")?.getAttribute("data-host");
  if (host) fillCheckFromThreatHost(host);
});

document.addEventListener("keydown", (ev) => {
  if (ev.key !== "Enter") return;
  const threatLi = ev.target instanceof Element ? ev.target.closest("#threatMachineList li, #threatWebList li") : null;
  if (!threatLi) return;
  const host = threatLi.getAttribute("data-host");
  if (!host) return;
  ev.preventDefault();
  fillCheckFromThreatHost(host);
});

function machineReason(reason) {
  return t(lang, `machineReason_${reason}`);
}

function machineRows(findings, limit) {
  const rows = (findings || []).slice(0, limit).map((item) => {
    const label = machineReason(item.reason);
    const text = item.display ? `${label} — ${item.display}` : label;
    const body = item.path ? `${text} · ${item.path}` : text;
    if (item.enforceable === "block-host" && item.host) {
      return { text: body, host: item.host, checkWeb: true };
    }
    return body;
  });
  const extra = (findings || []).length > limit ? (findings || []).length - limit : 0;
  if (extra > 0) rows.push(t(lang, "machineMore", { n: String(extra) }));
  return rows;
}

function restoreReason(code, forLang = lang) {
  if (code === "destination-exists") return t(forLang, "machineRestoreReason_destination_exists");
  if (code === "missing-quarantine") return t(forLang, "machineRestoreReason_missing_quarantine");
  return t(forLang, "machineRestoreReason_restore_failed");
}

/** Bilingual tooltip: current locale + the other (EN ↔ pt-PT). */
function restoreReasonTooltip(code) {
  const other = lang === "pt-PT" ? "en" : "pt-PT";
  const a = restoreReason(code, lang);
  const b = restoreReason(code, other);
  return a === b ? a : `${a} · ${b}`;
}

function fillTextList(list, rows, emptyText) {
  if (!list) return;
  list.replaceChildren();
  const items = rows.length ? rows : [emptyText];
  for (const row of items) {
    const li = document.createElement("li");
    if (row && typeof row === "object") {
      const label = document.createElement("span");
      label.textContent = row.text;
      li.appendChild(label);
      if (row.title) li.title = row.title;
      if (row.errorCode) li.dataset.restoreError = row.errorCode;
      if (row.title && row.errorCode) {
        const tipId = `restore-err-${row.errorCode}-${Math.random().toString(36).slice(2, 8)}`;
        const tip = document.createElement("span");
        tip.id = tipId;
        tip.className = "visually-hidden";
        tip.textContent = row.title;
        li.appendChild(tip);
        li.tabIndex = 0;
        li.setAttribute("aria-describedby", tipId);
      }
      if (row.host) {
        li.dataset.host = row.host;
        li.classList.add("threat-host-row");
        li.style.cursor = "pointer";
        li.title = row.host;
        if (!li.hasAttribute("tabindex")) li.tabIndex = 0;
        const enterHint =
          lang === "pt-PT"
            ? `${row.host}. Prima Enter para verificar.`
            : `${row.host}. Press Enter to check.`;
        li.setAttribute("aria-label", enterHint);
      }
      if (row.checkWeb && row.host) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "text-button check-on-web";
        btn.dataset.host = row.host;
        btn.textContent = t(lang, "checkOnWebsite");
        li.appendChild(btn);
      }
    } else {
      li.textContent = row;
    }
    list.appendChild(li);
  }
}

function renderMachine(view) {
  lastMachine = view;
  if (!els.machineStatus) return;
  const coverage = view?.coverage || {};
  const files = String(coverage.files || 0);
  const processes = String(coverage.processes || 0);
  const apps = String(coverage.applications || 0);
  const n = String(view?.actionableCount || view?.findingCount || 0);
  const gatePending = Boolean(els.honestLimitsGate && !els.honestLimitsGate.hidden);
  if (gatePending) {
    els.machineStatus.textContent = t(lang, "honestLimitsWaiting");
  } else if (view?.status === "scanning") {
    els.machineStatus.textContent = coverage.currentDir
      ? t(lang, "machineScanningDir", { dir: coverage.currentDir })
      : t(lang, "machineScanning");
  }
  else if (view?.status === "error") els.machineStatus.textContent = t(lang, "machineError", { error: view.error || "scan-failed" });
  else if (view?.status === "idle") els.machineStatus.textContent = t(lang, "machineIdle");
  else if ((view?.actionableCount || 0) > 0) els.machineStatus.textContent = t(lang, "machineReady", { n, files, processes, apps });
  else els.machineStatus.textContent = t(lang, "machineClear", { files, processes, apps });

  const notes = [];
  if (coverage.capped) notes.push(t(lang, "machineCapped"));
  if ((coverage.denied || []).length) notes.push(t(lang, "machineDenied", { n: String(coverage.denied.length) }));
  if (view?.decision?.choice === "block-maximum" && view.decision.findingSetId === view.findingSetId) {
    notes.push(
      t(lang, "machineBlocked", {
        hosts: String(view.decision.hosts || 0),
        files: String(view.quarantined || 0)
      })
    );
  } else if (view?.decision?.choice === "decline" && view.decision.findingSetId === view.findingSetId) {
    notes.push(t(lang, "machineDeclined"));
  }
  if (els.machineCoverage) els.machineCoverage.textContent = notes.join(" ");

  const trusted = view?.trustedSkipped || [];
  if (els.machineTrusted) {
    els.machineTrusted.hidden = trusted.length === 0;
    els.machineTrusted.textContent = trusted.length
      ? t(lang, "machineTrustedSkip", { hosts: trusted.join(", ") })
      : "";
  }
  fillTextList(els.machineOpen, machineRows(view?.openFindings, 8), t(lang, "machineEmptyList"));
  fillTextList(els.machineSettled, machineRows(view?.settledFindings, 8), t(lang, "machineEmptyList"));
  renderThreatSummary();
  const quarantineRows = (view?.quarantineItems || []).map((item) => {
    if (!item.error) return { text: item.from };
    return {
      text: `${item.from} — ${restoreReason(item.error)}`,
      title: restoreReasonTooltip(item.error),
      errorCode: item.error
    };
  });
  fillTextList(els.machineQuarantine, quarantineRows, t(lang, "machineQuarantineEmpty"));
  const sameDecision = view?.decision && view.decision.findingSetId === view.findingSetId;
  const blockedAlready = sameDecision && view.decision.choice === "block-maximum";
  if (els.machineBlockAgain) {
    els.machineBlockAgain.hidden = !(view?.status === "ready" && (view.actionableCount || 0) > 0 && !blockedAlready);
  }
  if (els.machineRestore) els.machineRestore.hidden = !(view?.quarantined > 0);
  syncMachineRescanPrimary(view?.status);
  if (els.machineContinue) {
    const showContinue = view?.status === "ready" && coverage.capped === true;
    els.machineContinue.hidden = !showContinue;
  }
  syncMachineGateButtons(view?.status, {
    continueWanted: view?.status === "ready" && coverage.capped === true,
    blockWanted: view?.status === "ready" && (view.actionableCount || 0) > 0 && !blockedAlready
  });

  const asking = view?.ask === true;
  if (els.machineAsk) {
    els.machineAsk.hidden = !asking;
    const trustedNote = trusted.length ? ` ${t(lang, "machineTrustedSkip", { hosts: trusted.join(", ") })}` : "";
    if (els.machineAskBody) els.machineAskBody.textContent = `${t(lang, "machineAskBody", { n })}${trustedNote}`;
    fillTextList(els.machineAskList, machineRows(view?.openFindings, 12), t(lang, "machineEmptyList"));
    if (shouldFocusAskDecline({ askVisible: asking, alreadyOpen: machineAskOpen })) {
      machineAskOpen = true;
      els.machineDecline?.focus();
    } else if (asking) {
      machineAskOpen = true;
    }
    if (!asking) machineAskOpen = false;
  }

  if (view?.status === "scanning") {
    if (!machinePollTimer) {
      machinePollTimer = setInterval(() => {
        void refreshMachine();
      }, 1000);
    }
  } else if (machinePollTimer) {
    clearInterval(machinePollTimer);
    machinePollTimer = null;
  }
}

function syncHonestLimitsGate(pending) {
  if (els.honestLimitsGate) {
    els.honestLimitsGate.hidden = !pending;
  }
  if (els.honestLimitsReset) {
    els.honestLimitsReset.hidden = pending;
  }
  if (pending && els.machineStatus) {
    els.machineStatus.textContent = t(lang, "honestLimitsWaiting");
  }
  syncMachineGateButtons(lastMachine?.status);
  syncMachineRescanPrimary(lastMachine?.status);
}

/**
 * While honest-limits gate is open: disable Scan again; hide Continue / Block again entirely.
 * @param {string|undefined} status
 * @param {{ continueWanted?: boolean, blockWanted?: boolean }} [vis]
 */
function syncMachineGateButtons(status, vis = {}) {
  const gatePending = Boolean(els.honestLimitsGate && !els.honestLimitsGate.hidden);
  if (els.machineRescan) {
    els.machineRescan.disabled = gatePending || status === "scanning";
  }
  if (els.machineContinue) {
    if (gatePending) els.machineContinue.hidden = true;
    else if (vis.continueWanted !== undefined) els.machineContinue.hidden = !vis.continueWanted;
    els.machineContinue.disabled = gatePending || status === "scanning";
  }
  if (els.machineBlockAgain) {
    if (gatePending) els.machineBlockAgain.hidden = true;
    else if (vis.blockWanted !== undefined) els.machineBlockAgain.hidden = !vis.blockWanted;
    els.machineBlockAgain.disabled = gatePending || status === "scanning";
  }
}

/** Privacy Never store → Halt outline on Export diagnostics (still a safe snapshot). */
function syncDiagnosticsExportStyle() {
  if (!els.diagnosticsExport) return;
  els.diagnosticsExport.classList.toggle("halt-outline", currentPrivacyMode() === "off");
}

/** After skip, Scan again is Halt primary until status leaves idle. */
function syncMachineRescanPrimary(status) {
  if (!els.machineRescan) return;
  const gatePending = Boolean(els.honestLimitsGate && !els.honestLimitsGate.hidden);
  const leftIdle = Boolean(status && status !== "idle");
  const usePrimary = honestLimitsSkipped && !gatePending && !leftIdle;
  const wasPrimary = els.machineRescan.classList.contains("is-primary");
  els.machineRescan.classList.toggle("is-primary", usePrimary);
  els.machineRescan.classList.toggle("text-button", !usePrimary);
  if (els.machineRescanPrimaryHint) {
    const hint = t(lang, "machineRescanPrimaryHint");
    els.machineRescanPrimaryHint.hidden = !usePrimary;
    // Live region: clear then set so polite AT announces when primary turns on;
    // clear text when primary drops after Scan again.
    if (!usePrimary) {
      els.machineRescanPrimaryHint.textContent = "";
    } else if (usePrimary && !wasPrimary) {
      els.machineRescanPrimaryHint.textContent = "";
      requestAnimationFrame(() => {
        if (els.machineRescanPrimaryHint) els.machineRescanPrimaryHint.textContent = hint;
      });
    } else {
      els.machineRescanPrimaryHint.textContent = hint;
    }
  }
  if (usePrimary) {
    els.machineRescan.setAttribute("aria-describedby", "machineRescanPrimaryHint");
  } else {
    els.machineRescan.removeAttribute("aria-describedby");
  }
}

function persistProxyGuideUserClosed(closed) {
  proxyGuideUserClosed = closed;
  try {
    if (closed) sessionStorage.setItem(PROXY_GUIDE_CLOSED_KEY, "1");
    else sessionStorage.removeItem(PROXY_GUIDE_CLOSED_KEY);
  } catch {
    /* ignore */
  }
  syncProxyGuideShowButton();
}

function syncProxyGuideShowButton() {
  if (!els.proxyGuideShow) return;
  const show = proxyGuideUserClosed || (els.proxyGuide && !els.proxyGuide.open);
  els.proxyGuideShow.hidden = !show;
  els.proxyGuideShow.textContent = t(lang, "proxyGuideShow");
}

/** Open proxy guide + only the current OS nested details (once per load). */
function openProxyGuideForPlatform(platform) {
  if (proxyGuideOsOpened) return;
  proxyGuideOsOpened = true;
  if (els.proxyGuide && !proxyGuideUserClosed) els.proxyGuide.open = true;
  if (els.proxyGuide && proxyGuideUserClosed) els.proxyGuide.open = false;
  const map = {
    darwin: els.proxyGuideMacDetails,
    win32: els.proxyGuideWinDetails,
    linux: els.proxyGuideLinuxDetails
  };
  for (const el of Object.values(map)) {
    if (el) el.open = false;
  }
  const match = map[platform] || els.proxyGuideLinuxDetails;
  if (match) match.open = true;
  syncProxyGuideShowButton();
}

els.proxyGuide?.addEventListener("toggle", (ev) => {
  if (typeof ev.newState === "string") {
    if (ev.newState === "closed") persistProxyGuideUserClosed(true);
    else syncProxyGuideShowButton();
    return;
  }
  // Older engines: .open may still be stale in the same turn — confirm next frame.
  requestAnimationFrame(() => {
    if (els.proxyGuide && !els.proxyGuide.open) persistProxyGuideUserClosed(true);
    else syncProxyGuideShowButton();
  });
});

/** Explicit control — only way to clear the sessionStorage closed flag. */
els.proxyGuideShow?.addEventListener("click", () => {
  persistProxyGuideUserClosed(false);
  proxyGuideOsOpened = false;
  openProxyGuideForPlatform(hostPlatform);
  if (els.proxyGuide) {
    els.proxyGuide.open = true;
    els.proxyGuide.scrollIntoView({ block: "nearest" });
  }
  syncProxyGuideShowButton();
});

async function refreshMachine() {
  try {
    const data = await fetch("/api/machine-scan").then((res) => res.json());
    if (data?.scan) renderMachine(data.scan);
  } catch {
    /* scan endpoint comes up with the dashboard */
  }
}

els.honestLimitsAck?.addEventListener("click", async () => {
  if (els.honestLimitsAck) els.honestLimitsAck.disabled = true;
  try {
    const res = await fetch("/api/honest-limits/ack", { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      if (els.machineStatus) {
        els.machineStatus.textContent = t(lang, "machineDecideFail", {
          error: data?.error || `HTTP ${res.status}`
        });
      }
      return;
    }
    honestLimitsSkipped = false;
    syncHonestLimitsGate(false);
    if (data.scan) renderMachine(data.scan);
  } finally {
    if (els.honestLimitsAck) els.honestLimitsAck.disabled = false;
  }
});

els.honestLimitsSkip?.addEventListener("click", async () => {
  if (els.honestLimitsSkip) els.honestLimitsSkip.disabled = true;
  try {
    const res = await fetch("/api/honest-limits/skip", { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data?.ok) return;
    honestLimitsSkipped = true;
    syncHonestLimitsGate(false);
    if (data.scan) renderMachine(data.scan);
    else if (els.machineStatus) els.machineStatus.textContent = t(lang, "machineIdle");
  } finally {
    if (els.honestLimitsSkip) els.honestLimitsSkip.disabled = false;
  }
});

els.honestLimitsReset?.addEventListener("click", async () => {
  const res = await fetch("/api/honest-limits/reset", { method: "POST" });
  const data = await res.json();
  if (!res.ok || !data?.ok) return;
  honestLimitsSkipped = false;
  syncHonestLimitsGate(Boolean(data.honestLimitsPending));
});

els.diagnosticsExport?.addEventListener("click", async () => {
  if (els.diagnosticsExport) els.diagnosticsExport.disabled = true;
  if (els.diagnosticsCopyPath) els.diagnosticsCopyPath.hidden = true;
  if (els.diagnosticsReveal) els.diagnosticsReveal.hidden = true;
  diagnosticsExportPath = null;
  if (els.diagnosticsExportStatus) {
    els.diagnosticsExportStatus.hidden = false;
    els.diagnosticsExportStatus.textContent = "";
  }
  try {
    const res = await fetch("/api/diagnostics/export", { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      if (els.diagnosticsExportStatus) {
        els.diagnosticsExportStatus.textContent = t(lang, "diagnosticsExportFail", {
          error: data?.error || `HTTP ${res.status}`
        });
      }
      return;
    }
    diagnosticsExportPath = typeof data.path === "string" ? data.path : null;
    if (els.diagnosticsExportStatus) {
      els.diagnosticsExportStatus.textContent = t(lang, "diagnosticsExportOk", {
        file: data.fileName || "diagnostics.json"
      });
    }
    if (diagnosticsExportPath) {
      if (els.diagnosticsCopyPath) {
        els.diagnosticsCopyPath.hidden = false;
        els.diagnosticsCopyPath.textContent = t(lang, "diagnosticsCopyPath");
      }
      if (els.diagnosticsReveal) {
        els.diagnosticsReveal.hidden = false;
        els.diagnosticsReveal.textContent = t(lang, "diagnosticsReveal");
      }
    }
  } catch (err) {
    if (els.diagnosticsExportStatus) {
      els.diagnosticsExportStatus.textContent = t(lang, "diagnosticsExportFail", {
        error: err instanceof Error ? err.message : "fail"
      });
    }
  } finally {
    if (els.diagnosticsExport) els.diagnosticsExport.disabled = false;
  }
});

els.diagnosticsCopyPath?.addEventListener("click", async () => {
  if (!diagnosticsExportPath) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(diagnosticsExportPath);
      if (els.diagnosticsExportStatus) {
        els.diagnosticsExportStatus.hidden = false;
        els.diagnosticsExportStatus.textContent = t(lang, "diagnosticsPathCopiedClipboard");
      }
      return;
    }
    throw new Error("clipboard-unavailable");
  } catch {
    const manual = window.prompt(
      t(lang, "diagnosticsExportOk", { file: diagnosticsExportPath }),
      diagnosticsExportPath
    );
    if (manual != null && els.diagnosticsExportStatus) {
      els.diagnosticsExportStatus.hidden = false;
      els.diagnosticsExportStatus.textContent = t(lang, "diagnosticsPathCopiedPrompt");
    }
  }
});

els.diagnosticsReveal?.addEventListener("click", async () => {
  if (!diagnosticsExportPath) return;
  const res = await fetch("/api/diagnostics/reveal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: diagnosticsExportPath })
  }).then((r) => r.json());
  if (res?.ok) {
    if (els.diagnosticsExportStatus) {
      els.diagnosticsExportStatus.hidden = false;
      els.diagnosticsExportStatus.textContent = t(lang, "diagnosticsRevealOk");
    }
    return;
  }
  const path = res?.path || diagnosticsExportPath;
  if (path) {
    try {
      await navigator.clipboard.writeText(path);
    } catch {
      /* ignore */
    }
  }
  if (els.diagnosticsExportStatus) {
    els.diagnosticsExportStatus.hidden = false;
    els.diagnosticsExportStatus.textContent = t(lang, "diagnosticsRevealDeferred");
  }
});

async function decideMachine(choice) {
  if (els.machineBlockMax) els.machineBlockMax.disabled = true;
  if (els.machineDecline) els.machineDecline.disabled = true;
  if (els.machineBlockAgain) els.machineBlockAgain.disabled = true;
  try {
    const res = await fetch("/api/machine-scan/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choice })
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      if (els.machineStatus) {
        els.machineStatus.textContent = t(lang, "machineDecideFail", { error: data?.error || `HTTP ${res.status}` });
      }
      return;
    }
    if (data.scan) renderMachine(data.scan);
    if (data.lists) renderLists(data.lists);
    if (choice === "block-maximum") {
      personalBlockCountSession += 1;
      forceProxyGuideOpen("proxyGuideAfterBlock");
      updateProxyQuietBanner();
    }
  } catch (err) {
    if (els.machineStatus) {
      els.machineStatus.textContent = t(lang, "machineDecideFail", {
        error: err instanceof Error ? err.message : "fail"
      });
    }
  } finally {
    if (els.machineBlockMax) els.machineBlockMax.disabled = false;
    if (els.machineDecline) els.machineDecline.disabled = false;
    if (els.machineBlockAgain) els.machineBlockAgain.disabled = false;
  }
}

els.machineRescan?.addEventListener("click", async () => {
  if (els.honestLimitsGate && !els.honestLimitsGate.hidden) return;
  if (els.machineRescan) els.machineRescan.disabled = true;
  try {
    const data = await fetch("/api/machine-scan/run", { method: "POST" }).then((res) => res.json());
    if (data?.scan) renderMachine(data.scan);
  } finally {
    const gatePending = Boolean(els.honestLimitsGate && !els.honestLimitsGate.hidden);
    if (els.machineRescan) {
      els.machineRescan.disabled = gatePending || lastMachine?.status === "scanning";
    }
  }
});

els.machineContinue?.addEventListener("click", async () => {
  if (els.machineContinue) els.machineContinue.disabled = true;
  try {
    const data = await fetch("/api/machine-scan/continue", { method: "POST" }).then((res) => res.json());
    if (data?.scan) renderMachine(data.scan);
    else if (els.machineStatus) {
      els.machineStatus.textContent = t(lang, "machineDecideFail", { error: data?.error || "continue-failed" });
    }
  } catch (err) {
    if (els.machineStatus) {
      els.machineStatus.textContent = t(lang, "machineDecideFail", {
        error: err instanceof Error ? err.message : "continue-failed"
      });
    }
  }
});

els.machineBlockMax?.addEventListener("click", () => {
  void decideMachine("block-maximum");
});

els.machineDecline?.addEventListener("click", () => {
  void decideMachine("decline");
});

els.machineBlockAgain?.addEventListener("click", () => {
  void decideMachine("block-maximum");
});

els.machineRestore?.addEventListener("click", async () => {
  if (els.machineRestore) els.machineRestore.disabled = true;
  try {
    const res = await fetch("/api/machine-scan/restore", { method: "POST" });
    const data = await res.json();
    if (data?.scan) renderMachine(data.scan);
    if (data?.lists) renderLists(data.lists);
    if (data?.ok && els.machineStatus) els.machineStatus.textContent = t(lang, "machineRestored");
    else if (!data?.ok && els.machineStatus) {
      els.machineStatus.textContent = t(lang, "machineDecideFail", {
        error: restoreReason(data?.result?.errors?.[0]?.error || "restore-failed")
      });
    }
  } catch (err) {
    if (els.machineStatus) {
      els.machineStatus.textContent = t(lang, "machineDecideFail", {
        error: err instanceof Error ? err.message : "restore-failed"
      });
    }
  } finally {
    if (els.machineRestore) els.machineRestore.disabled = false;
  }
});

function consumeDeepLinkBlockHost() {
  try {
    const params = new URLSearchParams(location.search);
    const host = (params.get("blockHost") || "").trim().toLowerCase();
    if (!host) return;
    void blockHostOnDevice(host).then((ok) => {
      if (ok) showMessageToast(t(lang, "websiteBlockedOnDevice", { host }));
      document.getElementById("listsSection")?.scrollIntoView({ block: "start" });
    });
    params.delete("blockHost");
    const next = `${location.pathname}${params.toString() ? `?${params}` : ""}${location.hash || "#listsSection"}`;
    history.replaceState(null, "", next);
  } catch {
    /* ignore */
  }
}

fetchState()
  .then(() => {
    connectSSE();
    void refreshMachine();
    void refreshLists();
    void probeWebsiteHealth();
    renderThreatSummary();
    consumeDeepLinkBlockHost();
    window.setInterval(() => {
      void probeWebsiteHealth({ silent: true });
    }, websiteHealthPollMs);
  })
  .catch((err) => console.debug("[dashboard] init failed", err));