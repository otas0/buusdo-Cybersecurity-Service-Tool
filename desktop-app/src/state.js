/**
 * In-memory dashboard state + SSE fan-out.
 *
 * privacyMode (default "off"):
 *  - off: no personal block log, no diagnostics log
 *  - local: session block log on this computer only
 *  - share: local log + anonymous { source, threat_type } for support troubleshooting
 */

const { EventEmitter } = require("events");
const { normalizePrivacyMode, recordIfEnabled } = require("./log-store");

const bus = new EventEmitter();
bus.setMaxListeners(50);

const MAX_LOG = 40;
/** Cap personal blocks in the ring so Trackers/Signals badges stay meaningful. */
const MAX_USER_BLOCK_LOG = 12;
/**
 * Clear ring (dashboard UI) is client-side only — no POST /api/log/clear and no SSE.
 * Lifetime totals (totalTrackersBlocked / totalPhishingBlocked) stay until process restart.
 * A server clear-ring endpoint is intentionally not added while UI-only clear is enough.
 */

const state = {
  lang: "en",
  privacyMode: "off",
  totalTrackersBlocked: 0,
  totalPhishingBlocked: 0,
  lastScanAt: null,
  lastScan: {
    level: "idle",
    trackersBlocked: 0,
    phishingHits: 0
  },
  /** @type {Array<{ id: string, at: string, kind: string, source: string, display: string, reason: string }>} */
  recentBlocks: []
};

function levelFromCounts(trackers, phishing) {
  if (phishing > 0) return "danger";
  if (trackers > 0) return "caution";
  return "safe";
}

function snapshot() {
  return {
    lang: state.lang,
    privacyMode: state.privacyMode,
    totalTrackersBlocked: state.totalTrackersBlocked,
    totalPhishingBlocked: state.totalPhishingBlocked,
    lastScanAt: state.lastScanAt,
    lastScan: { ...state.lastScan },
    recentBlocks: state.privacyMode === "off" ? [] : state.recentBlocks.slice(0, MAX_LOG)
  };
}

function setPrefs(patch) {
  if (patch.lang === "en" || patch.lang === "pt-PT") state.lang = patch.lang;
  if (patch.privacyMode != null) {
    const next = normalizePrivacyMode(patch.privacyMode);
    state.privacyMode = next;
    if (next === "off") state.recentBlocks = [];
  }
  emit("prefs", snapshot());
  return snapshot();
}

/**
 * Record a block (from proxy or scan) and notify SSE clients.
 * @param {{ kind: 'tracker'|'phishing'|'user-block', source: string, display: string, reason?: string }} evt
 */
function recordBlock(evt) {
  if (evt.kind === "tracker") state.totalTrackersBlocked += 1;
  if (evt.kind === "phishing" || evt.kind === "user-block") state.totalPhishingBlocked += 1;

  // Proxy blocks update the log and counters only. The address readout is finishScan.
  let entry = null;
  if (state.privacyMode !== "off") {
    entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
      kind: evt.kind,
      source: evt.source || "proxy",
      display: evt.display || "unknown",
      reason: evt.reason || ""
    };
    state.recentBlocks.unshift(entry);
    trimRecentBlocks();
  }

  if (
    state.privacyMode === "share" &&
    (evt.kind === "tracker" || evt.kind === "phishing" || evt.kind === "user-block")
  ) {
    recordIfEnabled("share", evt.kind === "user-block" ? "phishing" : evt.kind);
  }

  emit("block", { entry, state: snapshot() });
  return entry;
}

/** @type {{ key: string, at: number } | null} */
let lastListsEmit = null;

/** Keep newest entries; limit user-block density so other kinds remain visible. */
function trimRecentBlocks() {
  let userSeen = 0;
  state.recentBlocks = state.recentBlocks.filter((e) => {
    if (e.kind !== "user-block") return true;
    userSeen += 1;
    return userSeen <= MAX_USER_BLOCK_LOG;
  });
  if (state.recentBlocks.length > MAX_LOG) {
    state.recentBlocks.length = MAX_LOG;
  }
}

function listsEmitDebounceMs() {
  const n = Number(process.env.SHIELD_LISTS_SSE_DEBOUNCE_MS);
  if (Number.isFinite(n) && n >= 0) return n;
  return 600;
}

/**
 * Notify SSE clients that personal lists changed (Syncthing / import).
 * Debounces duplicate emits when API write + fs.watch both fire.
 * Window: SHIELD_LISTS_SSE_DEBOUNCE_MS (default 600).
 */
function emitLists(lists, path, mtimeMs) {
  const key = [
    lists?.updatedAt || "",
    (lists?.blocked || []).length,
    (lists?.trusted || []).length,
    (lists?.blocked || []).map((e) => e.domain).join(","),
    (lists?.trusted || []).map((e) => e.domain).join(",")
  ].join("|");
  const now = Date.now();
  const windowMs = listsEmitDebounceMs();
  if (lastListsEmit && lastListsEmit.key === key && now - lastListsEmit.at < windowMs) {
    return false;
  }
  lastListsEmit = { key, at: now };
  emit("lists", { lists, path, mtimeMs: mtimeMs ?? null });
  return true;
}

function finishScan(kind) {
  const level =
    kind === "phishing" || kind === "user-block" ? "danger" : kind === "tracker" ? "caution" : "safe";
  state.lastScanAt = new Date().toISOString();
  state.lastScan = {
    level,
    trackersBlocked: state.totalTrackersBlocked,
    phishingHits: state.totalPhishingBlocked
  };
  const snap = snapshot();
  emit("scan", snap);
  return snap;
}

function emit(type, payload) {
  bus.emit("event", { type, payload, at: new Date().toISOString() });
}

function publish(type, payload) {
  emit(type, payload);
}

function subscribe(listener) {
  bus.on("event", listener);
  return () => bus.off("event", listener);
}

module.exports = {
  snapshot,
  setPrefs,
  recordBlock,
  emitLists,
  listsEmitDebounceMs,
  finishScan,
  publish,
  subscribe,
  levelFromCounts,
  MAX_LOG,
  MAX_USER_BLOCK_LOG,
  trimRecentBlocks
};