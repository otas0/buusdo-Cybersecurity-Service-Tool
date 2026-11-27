/**
 * Background service worker (MV3)
 * --------------------------------
 * Responsibilities:
 *  1. Listen for declarativeNetRequest matched rules (tracker blocks).
 *  2. Detect phishing-like URL patterns on navigations / scans.
 *  3. Keep per-tab counters + overall traffic-light state in extension storage.
 *  4. Ask the content script to show a toast when something is blocked.
 * Privacy: privacyMode defaults to "off" (no personal data stored).
 *  - local: keep scan state on this device
 *  - share: also send anonymous { source, threat_type } for support troubleshooting
 */

/* Classic scripts: Safari rejects background.type = "module".
 * Keep support-blob.classic.js on this importScripts list if the SW is ever split
 * (manifest only points at this service_worker entry — scripts are not listed in manifest.json).
 * trackers-announce.classic.js is loaded so Website-API Trackers mute can use ShieldTrackersAnnounce
 * (createTrackersAnnounceClearScheduler) without a background.type=module. */
importScripts(
  "../shared/browser-api.classic.js",
  "../shared/detect.classic.js",
  "../shared/log-client.classic.js",
  "../shared/shield-lists.classic.js",
  "../shared/support-blob.classic.js",
  "../shared/tab-host-reset.classic.js",
  "../shared/trackers-announce.classic.js"
);
const { classifyUrl, detectPhishingPatterns, countThirdPartyTrackers } = globalThis.ShieldDetect;
const { normalizePrivacyMode, sendAnonymousLog } = globalThis.ShieldLog;
const ShieldLists = globalThis.ShieldLists;
const ShieldSupport = globalThis.ShieldSupport;
const { shouldHandleTabUpdated, registrableHint, nextTabsAfterHostChange } = globalThis.ShieldTabHost;
/** Website-API Trackers mute helpers (aria-live clear delay). */
const {
  TRACKERS_ANNOUNCE_CLEAR_MS,
  createTrackersAnnounceClearScheduler,
  nextTrackersAnnounceReadyAt,
  shouldAnnounceTrackersMute
} = globalThis.ShieldTrackersAnnounce;
/** Earliest time a Website-API mute may re-announce (after TRACKERS_ANNOUNCE_CLEAR_MS). */
let trackersAnnounceReadyAt = 0;
const trackersAnnounceClear = createTrackersAnnounceClearScheduler({
  clearMs: TRACKERS_ANNOUNCE_CLEAR_MS
});
/** True while aria-live mute announce is considered active (cleared after delay). */
let trackersApiAnnounceActive = false;

/**
 * Gate + schedule clear for Website-API Trackers mute announce (popup mirrors via lastScan flag).
 * @returns {boolean} true when this scan may announce (outside the clear window)
 */
function noteWebsiteApiTrackersMute() {
  const now = Date.now();
  if (!shouldAnnounceTrackersMute(now, trackersAnnounceReadyAt)) return false;
  trackersApiAnnounceActive = true;
  trackersAnnounceReadyAt = nextTrackersAnnounceReadyAt(now, TRACKERS_ANNOUNCE_CLEAR_MS);
  trackersAnnounceClear.schedule(() => {
    trackersApiAnnounceActive = false;
    trackersAnnounceReadyAt = Date.now();
  });
  return true;
}

const LISTS_KEY = "shieldPersonalLists";
/** Support diagnostics only — ISO timestamp of last successful paste; never the payload. */
const LISTS_LAST_PASTE_AT_KEY = "shieldListsLastPasteAt";
const DNR_PERSONAL_ID_BASE = 900000;

/** @typedef {'safe'|'caution'|'danger'|'idle'} TrafficLevel */
/** @typedef {'off'|'local'|'share'} PrivacyMode */

const DEFAULT_STATE = {
  lang: "en",
  privacyMode: "off",
  lastScanAt: null,
  lastScan: {
    level: "idle",
    trackersBlocked: 0,
    phishingHits: 0,
    url: null
  },
  /** tabId -> { trackers, phishing, lastToastAt } */
  tabs: {}
};

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function migrateState(raw) {
  const merged = { ...DEFAULT_STATE, ...(raw || {}) };
  if (merged.privacyMode == null && merged.shareAnonymous === true) {
    merged.privacyMode = "share";
  }
  merged.privacyMode = normalizePrivacyMode(merged.privacyMode);
  delete merged.shareAnonymous;
  if (merged.privacyMode === "off" && merged.lastScan) {
    merged.lastScan = { ...merged.lastScan, url: null, reasons: [] };
  }
  return merged;
}

async function getState() {
  const data = await api.storage.local.get("shieldState");
  return migrateState(data.shieldState);
}

async function setState(patch) {
  const current = await getState();
  const next = migrateState({ ...current, ...patch });
  if (next.privacyMode === "off") {
    next.recentBlocks = undefined;
    if (next.lastScan) next.lastScan = { ...next.lastScan, url: null, reasons: [] };
  }
  await api.storage.local.set({ shieldState: next });
  return next;
}

async function maybeShare(kind) {
  const state = await getState();
  if (state.privacyMode !== "share") return;
  if (kind !== "tracker" && kind !== "phishing") return;
  await sendAnonymousLog({ privacyMode: "share", source: "app", threatType: kind });
}

async function getPersonalLists() {
  const privacyMode = normalizePrivacyMode((await getState()).privacyMode);
  if (privacyMode === "off") return ShieldLists.emptyLists();
  const data = await api.storage.local.get(LISTS_KEY);
  try {
    if (data[LISTS_KEY]) return ShieldLists.parseBackup(data[LISTS_KEY]);
  } catch {
    /* fall through */
  }
  return ShieldLists.emptyLists();
}

async function setPersonalLists(lists) {
  const privacyMode = normalizePrivacyMode((await getState()).privacyMode);
  if (privacyMode === "off") {
    await api.storage.local.remove(LISTS_KEY);
    await syncPersonalBlockRules(ShieldLists.emptyLists());
    return { lists: ShieldLists.emptyLists(), dnr: { applied: 0, total: 0, truncated: false, limit: ShieldLists.PERSONAL_DNR_RULE_LIMIT || 500 } };
  }
  const next = ShieldLists.parseBackup(lists);
  await api.storage.local.set({ [LISTS_KEY]: next });
  const dnr = await syncPersonalBlockRules(next);
  return { lists: next, dnr };
}

async function syncPersonalBlockRules(lists) {
  const limit = ShieldLists.PERSONAL_DNR_RULE_LIMIT || 500;
  const total = (lists.blocked || []).length;
  const truncated = total > limit;
  if (!api.declarativeNetRequest?.updateDynamicRules) {
    return { applied: 0, total, truncated, limit };
  }
  try {
    const existing = await api.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = (existing || [])
      .filter((r) => r.id >= DNR_PERSONAL_ID_BASE && r.id < DNR_PERSONAL_ID_BASE + 5000)
      .map((r) => r.id);
    const addRules = (lists.blocked || []).slice(0, limit).map((entry, i) => ({
      id: DNR_PERSONAL_ID_BASE + i,
      priority: 1,
      action: { type: "block" },
      condition: {
        urlFilter: `||${entry.domain}^`,
        resourceTypes: [
          "main_frame",
          "sub_frame",
          "xmlhttprequest",
          "script",
          "image",
          "stylesheet",
          "font",
          "ping",
          "other"
        ]
      }
    }));
    await api.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules
    });
    return { applied: addRules.length, total, truncated, limit };
  } catch (err) {
    console.warn("[shield] personal DNR sync failed", err);
    return { applied: 0, total, truncated, limit, error: String(err?.message || err) };
  }
}

async function bumpTab(tabId, kind) {
  const state = await getState();
  const tabs = { ...(state.tabs || {}) };
  const entry = tabs[String(tabId)] || { trackers: 0, phishing: 0, lastToastAt: 0, host: "" };
  if (kind === "tracker") entry.trackers += 1;
  if (kind === "phishing") entry.phishing += 1;
  tabs[String(tabId)] = entry;
  await setState({ tabs });
  return entry;
}


async function countPageTrackers(tabId, pageUrl) {
  try {
    const [injected] = await api.scripting.executeScript({
      target: { tabId },
      func: () => performance.getEntriesByType("resource").map((entry) => entry.name).slice(0, 300)
    });
    const urls = Array.isArray(injected?.result) ? injected.result : [];
    if (typeof countThirdPartyTrackers === "function") {
      return countThirdPartyTrackers(pageUrl || "", urls);
    }
    let count = 0;
    for (const resourceUrl of urls) {
      if (classifyUrl(resourceUrl).kind === "tracker") count += 1;
    }
    return count;
  } catch {
    return 0;
  }
}

async function resetTabIfHostChanged(tabId, url) {
  const state = await getState();
  const { changed, tabs } = nextTabsAfterHostChange(state.tabs || {}, tabId, url || "");
  if (changed) await setState({ tabs });
}

// ---------------------------------------------------------------------------
// Content-script toasts
// ---------------------------------------------------------------------------

const TOAST_DISMISS_STORAGE_KEY = "shieldToastDismiss";

/** Read toast-dismiss flag in the SW so the content script does not race storage. */
async function isToastDismissEnabled() {
  try {
    const data = await api.storage.local.get(TOAST_DISMISS_STORAGE_KEY);
    return data?.[TOAST_DISMISS_STORAGE_KEY] === true;
  } catch {
    return false;
  }
}

/** Map browser UI language → extension toast / prefs id. */
function normalizeSystemLang(raw) {
  const id = String(raw || "").trim();
  if (!id) return "en";
  if (id === "pt-PT" || id === "pt" || id.startsWith("pt-PT")) return "pt-PT";
  if (id.startsWith("pt")) return "pt-PT";
  if (id === "zh-Hans" || id === "zh" || id === "zh-CN" || id === "zh-SG") return "zh-Hans";
  if (id === "zh-Hant" || id === "zh-TW" || id === "zh-HK" || id === "zh-MO") return "zh-Hant";
  if (id === "jp") return "ja";
  const short = id.split("-")[0];
  const known = new Set([
    "en",
    "pt-PT",
    "zh-Hans",
    "zh-Hant",
    "ja",
    "mi",
    "th",
    "vi",
    "de",
    "fr",
    "es",
    "it",
    "nl",
    "af",
    "zu",
    "xh",
    "st",
    "nr",
    "nso",
    "pt-BR"
  ]);
  if (known.has(id)) return id;
  if (known.has(short)) return short;
  return "en";
}

async function resolveSystemLang() {
  try {
    if (api.i18n?.getUILanguage) {
      return normalizeSystemLang(api.i18n.getUILanguage());
    }
  } catch {
    /* fall through */
  }
  const state = await getState();
  return normalizeSystemLang(state.lang || "en");
}

function hostFromUrl(url) {
  if (!url || !/^https?:/i.test(url)) return "";
  try {
    if (ShieldLists?.normalizeListHost) return ShieldLists.normalizeListHost(url);
  } catch {
    /* fall through */
  }
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Ask the content script in `tabId` to show a toast.
 * Falls back to scripting.executeScript if the content script is not ready.
 * Always sets `dismiss` from storage (default false) — content script trusts this boolean.
 * Threat toasts include `blockHost` + `showBlock` so the page can Block without opening the popup.
 */
async function showToast(tabId, payload) {
  const dismiss = await isToastDismissEnabled();
  const lang = payload.lang || (await resolveSystemLang());
  let blockHost = payload.blockHost || "";
  if (!blockHost && payload.url) blockHost = hostFromUrl(payload.url);
  if (!blockHost) {
    try {
      const tab = await api.tabs.get(tabId);
      blockHost = hostFromUrl(tab?.url || "");
    } catch {
      /* ignore */
    }
  }
  const showBlock =
    typeof payload.showBlock === "boolean" ? payload.showBlock : Boolean(blockHost);
  const message = {
    type: "SHIELD_TOAST",
    ...payload,
    lang,
    dismiss,
    blockHost: blockHost || undefined,
    showBlock: showBlock && Boolean(blockHost)
  };
  try {
    await api.tabs.sendMessage(tabId, message);
  } catch {
    // Content script may not be injected yet (e.g. chrome:// pages fail).
    try {
      await api.scripting.executeScript({
        target: { tabId },
        files: ["content/phishing-toast-mount.js", "content/content.js"]
      });
      await api.scripting.insertCSS({
        target: { tabId },
        files: ["content/toast.css"]
      });
      await api.tabs.sendMessage(tabId, message);
    } catch (err) {
      console.debug("[shield] toast skipped for tab", tabId, err?.message || err);
    }
  }
}

// ---------------------------------------------------------------------------
// Tracker blocks via declarativeNetRequest feedback
// ---------------------------------------------------------------------------

/**
 * Chrome fires this when a DNR rule matches (requires
 * declarativeNetRequestFeedback permission).
 */
if (api.declarativeNetRequest?.onRuleMatchedDebug) {
  // Available in unpacked / with feedback permission in Chromium.
  api.declarativeNetRequest.onRuleMatchedDebug.addListener(async (info) => {
    const tabId = info.tabId;
    if (tabId == null || tabId < 0) return;

    const entry = await bumpTab(tabId, "tracker");
    // Throttle toasts slightly so a burst of pixels does not spam the page.
    const now = Date.now();
    if (now - (entry.lastToastAt || 0) > 1200) {
      entry.lastToastAt = now;
      const state = await getState();
      const tabs = { ...(state.tabs || {}) };
      tabs[String(tabId)] = entry;
      await setState({ tabs });

      await showToast(tabId, {
        kind: "tracker",
        count: 1,
        lang: state.lang || (await resolveSystemLang()),
        showBlock: true
      });
      await maybeShare("tracker");
    }
  });
}

// Fallback path: some Chromium builds expose onRuleMatchedDebug only in
// developer mode; we also let the popup / scan path surface stored counters.

// ---------------------------------------------------------------------------
// Phishing detection on navigation
// ---------------------------------------------------------------------------

api.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // URL-gated via shouldHandleTabUpdated (url change or status complete).
  // Always run host reset with the resolved URL — nextTabsAfterHostChange is a no-op when
  // the registrable host is unchanged (host-only stamp / cross-host reset).
  if (!shouldHandleTabUpdated(changeInfo)) return;
  const url = changeInfo.url || tab.url;
  if (!url) return;
  await resetTabIfHostChanged(tabId, url);

  // Keep prefs.lang aligned with the browser UI language when tabs navigate.
  const systemLang = await resolveSystemLang();
  const prefState = await getState();
  if (prefState.lang !== systemLang) {
    await setState({ lang: systemLang });
  }

  const result = detectPhishingPatterns(url);
  if (result.matched) {
    const lists = await getPersonalLists();
    if (!ShieldLists.isDomainTrustedInLists(lists, url)) {
      const entry = await bumpTab(tabId, "phishing");
      const now = Date.now();
      // Throttle: url change + status:complete both hit this path for the same host.
      if (now - (entry.lastToastAt || 0) > 4000) {
        entry.lastToastAt = now;
        const tabs = { ...((await getState()).tabs || {}) };
        tabs[String(tabId)] = entry;
        await setState({ tabs });
        await showToast(tabId, {
          kind: "phishing",
          count: 1,
          lang: systemLang,
          url,
          showBlock: true
        });
        await maybeShare("phishing");
      }

      const privacyMode = (await getState()).privacyMode;
      // Keep lastScan roughly in sync if the user has the popup closed.
      await setState({
        lastScan: {
          level: "danger",
          trackersBlocked: entry.trackers || 0,
          phishingHits: entry.phishing || 0,
          url: privacyMode === "off" ? null : url,
          reasons: privacyMode === "off" ? [] : result.reasons
        }
      });
    }
  }

  // Auto-scan when the page finishes loading (popup can stay closed).
  // Phishing/tracker page toasts already fire above / via DNR — do not re-toast here.
  if (changeInfo.status === "complete" && /^https?:/i.test(url)) {
    const lastScan = await runScan(tabId, url, { fromAuto: true });
    // Page-resource trackers (no DNR hit yet) still need a caution toast + Block.
    if (
      lastScan.level === "caution" &&
      (lastScan.trackersBlocked || 0) > 0 &&
      !result.matched
    ) {
      const entry = (await getState()).tabs?.[String(tabId)] || {};
      const now = Date.now();
      if (now - (entry.lastToastAt || 0) > 2500) {
        await showToast(tabId, {
          kind: "tracker",
          count: lastScan.trackersBlocked,
          lang: systemLang,
          url,
          showBlock: true
        });
        const tabs = { ...((await getState()).tabs || {}) };
        const next = { ...(tabs[String(tabId)] || {}), lastToastAt: now };
        tabs[String(tabId)] = next;
        await setState({ tabs });
      }
    }
  }
});

api.tabs.onRemoved.addListener(async (tabId) => {
  const state = await getState();
  if (!state.tabs?.[String(tabId)]) return;
  const tabs = { ...state.tabs };
  delete tabs[String(tabId)];
  await setState({ tabs });
});

// ---------------------------------------------------------------------------
// Scan coordination (popup → background)
// ---------------------------------------------------------------------------

/**
 * Compute traffic-light level from counters.
 * SAFE = nothing; CAUTION = trackers only; DANGER = any phishing signal.
 * @param {number} trackers
 * @param {number} phishing
 * @returns {TrafficLevel}
 */
function levelFromCounts(trackers, phishing) {
  if (phishing > 0) return "danger";
  if (trackers > 0) return "caution";
  return "safe";
}

/**
 * @param {number} tabId
 * @param {string} url
 * @param {{ fromAuto?: boolean }} [opts] fromAuto skips phishing toast (onUpdated already toasted)
 */
async function runScan(tabId, url, opts = {}) {
  const phishing = detectPhishingPatterns(url || "");
  await resetTabIfHostChanged(tabId, url || "");
  const state = await getState();
  const lists = await getPersonalLists();
  const trusted = ShieldLists.isDomainTrustedInLists(lists, url || "");
  const entry = state.tabs?.[String(tabId)] || { trackers: 0, phishing: 0 };
  const seenTrackers = await countPageTrackers(tabId, url || "");
  const lang = await resolveSystemLang();

  // If the current URL matches phishing patterns, ensure the counter reflects it.
  let phishingHits = entry.phishing || 0;
  if (phishing.matched && !trusted && phishingHits === 0) {
    const bumped = await bumpTab(tabId, "phishing");
    phishingHits = bumped.phishing;
    if (!opts.fromAuto) {
      await showToast(tabId, {
        kind: "phishing",
        count: 1,
        lang,
        url,
        showBlock: true
      });
    }
  }
  if (trusted) phishingHits = 0;

  if (seenTrackers > 0 && (entry.trackers || 0) === 0) {
  }

  const trackersBlocked = Math.max(entry.trackers || 0, seenTrackers);
  const level = levelFromCounts(trackersBlocked, phishingHits);

  let storedUrl = url || null;
  const privacyMode = state.privacyMode || "off";
  if (privacyMode === "off") {
    storedUrl = null;
  } else {
    try {
      if (storedUrl) {
        const parsed = new URL(storedUrl);
        parsed.search = "";
        parsed.hash = "";
        storedUrl = parsed.toString();
      }
    } catch {
      /* keep the original string when it is not a URL */
    }
  }

  const lastScan = {
    level,
    trackersBlocked,
    phishingHits,
    url: storedUrl,
    reasons: privacyMode === "off" ? [] : phishing.reasons || []
  };

  await setState({
    lastScanAt: new Date().toISOString(),
    lastScan
  });

  if (phishing.matched) await maybeShare("phishing");
  else if (trackersBlocked > 0) await maybeShare("tracker");

  return lastScan;
}

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === "SHIELD_SCAN") {
      const result = await runScan(message.tabId, message.url);
      sendResponse({ ok: true, result });
      return;
    }

    if (message?.type === "SHIELD_GET_STATE") {
      const state = await getState();
      sendResponse({ ok: true, state });
      return;
    }

    if (message?.type === "SHIELD_SET_PREFS") {
      const patch = {};
      if (message.lang != null && message.lang !== "") {
        patch.lang = normalizeSystemLang(message.lang);
      }
      if (message.privacyMode != null) patch.privacyMode = normalizePrivacyMode(message.privacyMode);
      const state = await setState(patch);
      if (patch.privacyMode === "off") {
        await api.storage.local.remove([
          LISTS_KEY,
          LISTS_LAST_PASTE_AT_KEY,
          "shieldAccountAccessToken",
          "shieldAccountRefreshToken",
          "shieldAccountEmail",
          "shieldAccountSyncEnabled"
        ]);
        await syncPersonalBlockRules(ShieldLists.emptyLists());
      }
      sendResponse({ ok: true, state });
      return;
    }

    if (message?.type === "SHIELD_LISTS_GET") {
      const lists = await getPersonalLists();
      sendResponse({ ok: true, lists });
      return;
    }

    if (message?.type === "SHIELD_LISTS_HOST_BLOCKED") {
      const lists = await getPersonalLists();
      let blocked = false;
      try {
        blocked = Boolean(
          ShieldLists.isDomainBlockedInLists(lists, message.url || message.domain || "")
        );
      } catch {
        blocked = false;
      }
      sendResponse({ ok: true, blocked });
      return;
    }

    if (message?.type === "SHIELD_SUPPORT_BLOB") {
      const st = await getState();
      let lastPasteAt = null;
      let accountSignedIn = false;
      try {
        const pasteStore = await api.storage.local.get(LISTS_LAST_PASTE_AT_KEY);
        const raw = pasteStore?.[LISTS_LAST_PASTE_AT_KEY];
        if (typeof raw === "string" && raw) lastPasteAt = raw;
      } catch {
        /* ignore */
      }
      try {
        const tok = await api.storage.local.get("shieldAccountAccessToken");
        accountSignedIn = typeof tok?.shieldAccountAccessToken === "string" && Boolean(tok.shieldAccountAccessToken);
      } catch {
        accountSignedIn = false;
      }
      sendResponse(
        ShieldSupport.buildSupportResponse(st.privacyMode, lastPasteAt, undefined, {
          trackersApiAnnounceActive,
          trackersMutedAnnounced: st.lastScan?.trackersMutedAnnounced === true,
          accountSignedIn
        })
      );
      return;
    }

    if (message?.type === "SHIELD_LISTS_ADD_BLOCK") {
      // Explicit Block (toast / tab) implies device-local list storage.
      const st = await getState();
      if (st.privacyMode === "off") {
        await setState({ privacyMode: "local" });
      }
      const cur = await getPersonalLists();
      const { lists, dnr } = await setPersonalLists(
        ShieldLists.addBlocked(cur, message.domain, message.reason || "user")
      );
      sendResponse({ ok: true, lists, dnr });
      return;
    }

    if (message?.type === "SHIELD_LISTS_ADD_TRUST") {
      const cur = await getPersonalLists();
      const { lists, dnr } = await setPersonalLists(ShieldLists.addTrusted(cur, message.domain));
      sendResponse({ ok: true, lists, dnr });
      return;
    }

    if (message?.type === "SHIELD_LISTS_REMOVE") {
      const cur = await getPersonalLists();
      const { lists, dnr } = await setPersonalLists(ShieldLists.removeDomain(cur, message.domain));
      sendResponse({ ok: true, lists, dnr });
      return;
    }

    if (message?.type === "SHIELD_LISTS_IMPORT") {
      (async () => {
        try {
          let incoming;
          if (ShieldLists.expandQrOrBackupAsync) {
            incoming = await ShieldLists.expandQrOrBackupAsync(message.backup);
          } else if (ShieldLists.expandQrOrBackup) {
            incoming = ShieldLists.expandQrOrBackup(message.backup);
          } else {
            incoming = ShieldLists.parseBackup(message.backup);
          }
          const cur = await getPersonalLists();
          const { lists, dnr } = await setPersonalLists(ShieldLists.mergeBackups(cur, incoming));
          sendResponse({ ok: true, lists, dnr });
        } catch (err) {
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : "invalid-backup"
          });
        }
      })();
      return true;
    }

    if (message?.type === "SHIELD_LISTS_EXPORT") {
      const lists = await getPersonalLists();
      let lastPasteAt = null;
      try {
        const pasteStore = await api.storage.local.get(LISTS_LAST_PASTE_AT_KEY);
        const raw = pasteStore?.[LISTS_LAST_PASTE_AT_KEY];
        if (typeof raw === "string" && raw) lastPasteAt = raw;
      } catch {
        /* ignore */
      }
      sendResponse({
        ok: true,
        lists,
        backup: lists,
        json: ShieldLists.serializeBackup(lists),
        compact: ShieldLists.compactPayloadForQr(lists),
        filename: ShieldLists.backupDownloadName(),
        /** Support-only ISO timestamp; never includes paste payload. */
        lastPasteAt
      });
      return;
    }

    if (message?.type === "SHIELD_LISTS_BLOCK_TAB") {
      const [tab] = await api.tabs.query({ active: true, currentWindow: true });
      const pageUrl = tab?.url || "";
      if (!/^https?:\/\//i.test(pageUrl)) {
        sendResponse({ ok: false, error: "need-http-tab" });
        return;
      }
      try {
        const domain = ShieldLists.normalizeListHost(pageUrl);
        const cur = await getPersonalLists();
        const { lists, dnr } = await setPersonalLists(
          ShieldLists.addBlocked(cur, domain, message.reason || "tab")
        );
        sendResponse({ ok: true, lists, dnr, domain });
      } catch (err) {
        sendResponse({ ok: false, error: err instanceof Error ? err.message : "block-tab-failed" });
      }
      return;
    }

    /** Persist website API check into lastScan (domain risk only — never store full URL when privacy off). */
    if (message?.type === "SHIELD_RECORD_API_SCAN") {
      const privacyMode = normalizePrivacyMode((await getState()).privacyMode);
      const riskLevel = String(message.riskLevel || "");
      let level = "safe";
      if (riskLevel === "CRITICAL" || riskLevel === "HIGH") level = "danger";
      else if (riskLevel === "CAUTION" || riskLevel === "UNKNOWN") level = "caution";
      else if (riskLevel === "LOW_EVIDENCE") level = "safe";
      else level = "idle";

      const phishingHits = level === "danger" || level === "caution" ? 1 : 0;
      const trackersMutedAnnounced = noteWebsiteApiTrackersMute();
      const lastScan = {
        level,
        trackersBlocked: 0,
        phishingHits,
        url: privacyMode === "off" ? null : message.domain || null,
        reasons: privacyMode === "off" ? [] : [`api:${riskLevel || "unknown"}`],
        source: "website-api",
        trackersMutedAnnounced,
        trackersApiAnnounceActive
      };
      const state = await setState({
        lastScanAt: new Date().toISOString(),
        lastScan
      });
      sendResponse({ ok: true, state, result: lastScan });
      return;
    }

    sendResponse({ ok: false, error: "unknown-message" });
  })();

  // Keep the message channel open for async sendResponse.
  return true;
});

console.info("[shield] service worker ready");