/**
 * Preventive Shield — Desktop App (Part 2)
 * -----------------------------------------
 * - Express dashboard UI on http://localhost:3010 (UI_PORT; website uses :3000)
 * - Educational HTTP proxy on http://127.0.0.1:8080
 *
 * Aligns visually with the Chrome extension (Part 1).
 */

const fs = require("fs");
const path = require("path");
const express = require("express");
const state = require("./state");
const { appendAnonymous } = require("./log-store");
const { classifyUrl, countThirdPartyTrackers, loadDetector } = require("./threats");
const { startProxy, PROXY_PORT } = require("./proxy-server");
const { validateCheckTiming } = require("./validate-timing");
const { sharedRoot } = require("./shared-root");
const listsStore = require("./lists-store");
const accountTokens = require("./account-tokens");
const machineScan = require("./machine-scan");
const machineBlock = require("./machine-block");
const autostart = require("./autostart");
const { defaultDataDir, ensureDataDir } = require("./user-data");
const { quitGraceMs } = require("./quit-grace");
const diagnosticsExport = require("./diagnostics-export");
const { revealPathInShell } = require("./reveal-path");

function trayAvailable() {
  if (typeof global.__shieldTrayAvailable === "boolean") return global.__shieldTrayAvailable;
  try {
    require.resolve("systray2");
    return true;
  } catch {
    return false;
  }
}

/** Default 3010 so vinext website can keep :3000. Override with UI_PORT. */
const UI_PORT = Number(process.env.UI_PORT || 3010);
/** First-party website check API (no third-party reputation). */
/** Prefer env; else shared/production-site.json after deploy; else localhost vinext. */
function resolveWebsiteCheckUrl() {
  if (process.env.WEBSITE_CHECK_URL) {
    return {
      url: String(process.env.WEBSITE_CHECK_URL).trim().replace(/\/$/, ""),
      source: "env:WEBSITE_CHECK_URL"
    };
  }
  try {
    const sitePath = path.join(sharedRoot(), "production-site.json");
    const site = require(sitePath);
    const origin = String(site?.productionOrigin || "")
      .trim()
      .replace(/\/$/, "");
    if (origin) {
      return { url: origin, source: `file:shared/production-site.json` };
    }
  } catch {
    /* empty */
  }
  return { url: "http://localhost:3000", source: "fallback:localhost:3000" };
}
const _websiteResolved = resolveWebsiteCheckUrl();
const WEBSITE_CHECK_URL = _websiteResolved.url;
const WEBSITE_CHECK_URL_SOURCE = _websiteResolved.source;

/** Dashboard poll interval for GET /api/website-health (ms). Min 5s. */
const WEBSITE_HEALTH_POLL_MS = Math.max(
  5000,
  Number(process.env.WEBSITE_HEALTH_POLL_MS || 15_000) || 15_000
);
const ROOT = path.join(__dirname, "..");
const SHARED = sharedRoot();

let uiServer = null;
let proxyServer = null;

function shutdown() {
  const servers = [uiServer, proxyServer].filter(Boolean);
  uiServer = null;
  proxyServer = null;
  return Promise.all(
    servers.map(
      (server) =>
        new Promise((resolve) => {
          server.close(() => resolve());
        })
    )
  );
}

module.exports = { shutdown };

const app = express();
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
  }
  next();
});
app.use(express.json({ limit: "32kb" }));

// Shared tokens for both surfaces — no-store so tray reopen does not keep stale CSS/JS.
const staticHeaders = {
  setHeaders(res, filePath) {
    if (/\.(css|js|html)$/i.test(filePath)) {
      res.setHeader("Cache-Control", "no-store");
    }
  }
};

/** Bump with desktop-app/package.json version so tray reopen never sticks on stale CSS/JS. */
function assetVersion() {
  try {
    return String(require(path.join(ROOT, "package.json")).version || "0");
  } catch {
    return "0";
  }
}

function injectAssetVersion(html) {
  const v = assetVersion();
  return String(html).replace(
    /(\/(?:shared|css|js)\/[^"'?\s]+(?:\.(?:css|js)))(?:\?v=[^"']*)?/g,
    `$1?v=${v}`
  );
}

app.get(["/", "/index.html"], (_req, res) => {
  const indexPath = path.join(ROOT, "public", "index.html");
  let html = fs.readFileSync(indexPath, "utf8");
  html = injectAssetVersion(html);
  res.setHeader("Cache-Control", "no-store");
  res.type("html").send(html);
});

app.use("/shared", express.static(SHARED, staticHeaders));
app.use(express.static(path.join(ROOT, "public"), staticHeaders));

app.get("/api/state", async (_req, res) => {
  const lists = await listsStore.getLists();
  res.json({
    ok: true,
    state: state.snapshot(),
    ports: { ui: UI_PORT, proxy: PROXY_PORT },
    websiteHealthPollMs: WEBSITE_HEALTH_POLL_MS,
    websiteCheckUrl: WEBSITE_CHECK_URL,
    listsPath: listsStore.listsPath(),
    listsMtimeMs: listsStore.listsMtimeMs(),
    dataDir: defaultDataDir(),
    settings: autostart.readSettings(),
    honestLimitsPending: !autostart.honestLimitsResolved(),
    platform: process.platform,
    trayAvailable: trayAvailable(),
    quitGraceMs: quitGraceMs(),
    lists
  });
});

app.get("/api/settings", (_req, res) => {
  const settings = autostart.readSettings();
  res.json({
    ok: true,
    settings,
    honestLimitsPending: !autostart.honestLimitsResolved(settings),
    dataDir: defaultDataDir()
  });
});

app.put("/api/settings", (req, res) => {
  if (typeof req.body?.openAtLogin !== "boolean") {
    return res.status(400).json({ ok: false, error: "openAtLogin-required" });
  }
  const result = autostart.setOpenAtLogin(req.body.openAtLogin);
  if (!result.applied.ok) {
    return res.status(500).json({
      ok: false,
      error: result.applied.error || "autostart-failed",
      settings: result.settings
    });
  }
  res.json({ ok: true, settings: result.settings, applied: result.applied });
});

/** First-launch honest limits: ack → start scan; skip → no auto scan; reset → show gate again. */
app.post("/api/honest-limits/ack", (_req, res) => {
  const settings = autostart.setHonestLimitsAck();
  let scan = null;
  try {
    scan = machineScan.requestRun();
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "scan-failed",
      settings
    });
  }
  res.json({ ok: true, settings, scan, honestLimitsPending: false });
});

app.post("/api/honest-limits/skip", (_req, res) => {
  const settings = autostart.setHonestLimitsSkip();
  // Leave machine idle so Scan again is Halt primary (polite live region).
  const scan = machineScan.resetToIdle();
  res.json({
    ok: true,
    settings,
    scan,
    honestLimitsPending: false
  });
});

app.post("/api/honest-limits/reset", (_req, res) => {
  const settings = autostart.clearHonestLimits();
  res.json({
    ok: true,
    settings,
    honestLimitsPending: !autostart.honestLimitsResolved(settings)
  });
});

/** Diagnostics JSON under user data dir — counts/status only, never URLs or list hosts. */
app.post("/api/diagnostics/export", async (_req, res) => {
  try {
    const lists = await listsStore.getLists();
    const scan = machineScan.publicView();
    let quarantineCount = 0;
    try {
      const fs = require("fs");
      const qRoot = process.env.SHIELD_QUARANTINE_PATH
        ? path.resolve(process.env.SHIELD_QUARANTINE_PATH)
        : path.join(ensureDataDir(), "quarantine");
      const qPath = path.join(qRoot, "manifest.json");
      if (fs.existsSync(qPath)) {
        const man = JSON.parse(fs.readFileSync(qPath, "utf8"));
        quarantineCount = Array.isArray(man?.items) ? man.items.length : 0;
      }
    } catch {
      /* ignore */
    }
    const result = diagnosticsExport.writeDiagnosticsExport({
      settings: autostart.readSettings(),
      ports: { ui: UI_PORT, proxy: PROXY_PORT },
      machineStatus: scan?.status || "unknown",
      listsCounts: {
        blocked: Array.isArray(lists?.blocked) ? lists.blocked.length : 0,
        trusted: Array.isArray(lists?.trusted) ? lists.trusted.length : 0
      },
      quarantineCount,
      privacyMode: state.snapshot()?.privacyMode || "off",
      trayAvailable: trayAvailable(),
      quitGraceMs: quitGraceMs()
    });
    res.json({
      ok: true,
      path: result.path,
      fileName: result.fileName,
      payload: result.payload
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "diagnostics-export-failed"
    });
  }
});

app.post("/api/quit", (_req, res) => {
  state.publish("bye", { reason: "quit" });
  res.json({ ok: true, bye: true, graceMs: quitGraceMs() });
  setTimeout(() => {
    if (typeof global.__shieldQuit === "function") {
      global.__shieldQuit();
      return;
    }
    void shutdown().finally(() => process.exit(0));
  }, quitGraceMs());
});

app.get("/api/lists", async (_req, res) => {
  const lists = await listsStore.getLists();
  res.json({
    ok: true,
    lists,
    path: listsStore.listsPath(),
    mtimeMs: listsStore.listsMtimeMs()
  });
});

function emitListsUpdate(lists) {
  state.emitLists(lists, listsStore.listsPath(), listsStore.listsMtimeMs());
}

app.post("/api/lists/block", async (req, res) => {
  try {
    const mod = await listsStore.loadMod();
    const cur = await listsStore.getLists();
    const lists = await listsStore.writeLists(
      mod.addBlocked(cur, req.body?.domain, req.body?.reason || "user")
    );
    emitListsUpdate(lists);
    res.json({ ok: true, lists });
  } catch (err) {
    res.status(400).json({ ok: false, error: err instanceof Error ? err.message : "block-failed" });
  }
});

app.post("/api/lists/trust", async (req, res) => {
  try {
    const mod = await listsStore.loadMod();
    const cur = await listsStore.getLists();
    const lists = await listsStore.writeLists(mod.addTrusted(cur, req.body?.domain));
    emitListsUpdate(lists);
    res.json({ ok: true, lists });
  } catch (err) {
    res.status(400).json({ ok: false, error: err instanceof Error ? err.message : "trust-failed" });
  }
});

app.post("/api/lists/remove", async (req, res) => {
  try {
    const mod = await listsStore.loadMod();
    const cur = await listsStore.getLists();
    const lists = await listsStore.writeLists(mod.removeDomain(cur, req.body?.domain));
    emitListsUpdate(lists);
    res.json({ ok: true, lists });
  } catch (err) {
    res.status(400).json({ ok: false, error: err instanceof Error ? err.message : "remove-failed" });
  }
});

app.post("/api/lists/import", async (req, res) => {
  try {
    const mod = await listsStore.loadMod();
    const raw = req.body?.backup ?? req.body;
    const incoming = mod.expandQrOrBackup ? mod.expandQrOrBackup(raw) : mod.parseBackup(raw);
    const cur = await listsStore.getLists();
    const lists = await listsStore.writeLists(mod.mergeBackups(cur, incoming));
    emitListsUpdate(lists);
    res.json({ ok: true, lists });
  } catch (err) {
    res.status(400).json({ ok: false, error: err instanceof Error ? err.message : "import-failed" });
  }
});

app.post("/api/lists/reveal", async (_req, res) => {
  const result = await revealPathInShell(listsStore.listsPath());
  if (result.status) return res.status(result.status).json(result);
  res.json(result);
});

/** Reveal latest diagnostics-*.json (or body.path) — same shell path as lists reveal. */
app.post("/api/diagnostics/reveal", async (req, res) => {
  const fs = require("fs");
  let file = typeof req.body?.path === "string" ? req.body.path.trim() : "";
  if (!file) {
    try {
      const dir = ensureDataDir();
      const names = fs
        .readdirSync(dir)
        .filter((n) => /^diagnostics-.*\.json$/i.test(n))
        .sort();
      if (names.length) file = path.join(dir, names[names.length - 1]);
    } catch {
      /* ignore */
    }
  }
  if (!file) {
    return res.status(404).json({ ok: false, error: "diagnostics-not-found" });
  }
  // Only allow files under the user data directory.
  const root = path.resolve(ensureDataDir());
  const resolved = path.resolve(file);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    return res.status(400).json({ ok: false, error: "path-outside-data-dir" });
  }
  const result = await revealPathInShell(resolved);
  if (result.status) return res.status(result.status).json(result);
  res.json(result);
});

app.get("/api/lists/export", async (_req, res) => {
  const mod = await listsStore.loadMod();
  const lists = await listsStore.getLists();
  const filename = mod.backupDownloadName();
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.type("application/json").send(mod.serializeBackup(lists));
});

app.get("/api/lists/qr", async (req, res) => {
  const mod = await listsStore.loadMod();
  const lists = await listsStore.getLists();
  const wantZlib = String(req.query.zlib || "") === "1" || req.query.zlib === "true";
  const compact = mod.compactPayloadForQr(lists);
  let compactZ = null;
  if (wantZlib || String(req.query.both || "") === "1") {
    try {
      compactZ = mod.compactPayloadForQr(lists, 40, { zlib: true });
    } catch {
      compactZ = null;
    }
  }
  res.json({
    ok: true,
    compact: wantZlib && compactZ ? compactZ : compact,
    compactZ,
    zlibPrefix: mod.QR_ZLIB_PREFIX || "ZB1:"
  });
});

app.post("/api/prefs", async (req, res) => {
  const snap = state.setPrefs({
    lang: req.body?.lang,
    privacyMode: req.body?.privacyMode
  });
  let listsCleared = false;
  if (req.body?.clearLists === true && snap.privacyMode === "off") {
    await listsStore.clearListsFile();
    accountTokens.clearTokens();
    listsCleared = true;
    state.emitLists(await listsStore.getLists(), listsStore.listsPath(), listsStore.listsMtimeMs());
  }
  res.json({ ok: true, state: snap, listsCleared });
});

/** Account sync — tokens in data/account-tokens.json; upstream = WEBSITE_CHECK_URL. */
app.get("/api/account", (_req, res) => {
  const tokens = accountTokens.readTokens();
  res.json({
    ok: true,
    email: tokens.email || null,
    signedIn: Boolean(tokens.accessToken),
    syncEnabled: tokens.syncEnabled === true,
    website: WEBSITE_CHECK_URL,
    lastSyncError: tokens.lastSyncError || null,
    lastSyncErrorAt: tokens.lastSyncErrorAt || null
  });
});

app.post("/api/account/prefs", (req, res) => {
  const patch = {};
  if (typeof req.body?.syncEnabled === "boolean") patch.syncEnabled = req.body.syncEnabled;
  if (typeof req.body?.email === "string") patch.email = req.body.email.trim().toLowerCase();
  const tokens = accountTokens.writeTokens(patch);
  res.json({
    ok: true,
    email: tokens.email || null,
    signedIn: Boolean(tokens.accessToken),
    syncEnabled: tokens.syncEnabled === true
  });
});

app.post("/api/account/magic/request", async (req, res) => {
  try {
    const response = await fetch(`${WEBSITE_CHECK_URL}/api/auth/magic/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: req.body?.email,
        client: "desktop"
      })
    });
    const data = await response.json();
    if (typeof req.body?.email === "string") {
      accountTokens.writeTokens({ email: String(req.body.email).trim().toLowerCase() });
    }
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : "magic-request-failed"
    });
  }
});

app.post("/api/account/device/exchange", async (req, res) => {
  try {
    const response = await fetch(`${WEBSITE_CHECK_URL}/api/auth/device/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceCode: req.body?.deviceCode })
    });
    const data = await response.json();
    if (!response.ok || !data?.ok) return res.status(response.status).json(data);
    const tokens = accountTokens.writeTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt || null
    });
    return res.json({
      ok: true,
      email: tokens.email || null,
      signedIn: true,
      syncEnabled: tokens.syncEnabled === true,
      expiresAt: tokens.expiresAt
    });
  } catch (err) {
    return res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : "exchange-failed"
    });
  }
});

app.post("/api/account/logout", async (_req, res) => {
  const tokens = accountTokens.readTokens();
  try {
    if (tokens.accessToken) {
      await fetch(`${WEBSITE_CHECK_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokens.accessToken}` }
      });
    }
  } catch {
    /* ignore upstream */
  }
  accountTokens.clearTokens();
  res.json({ ok: true, signedOut: true });
});

app.post("/api/account/sync", async (_req, res) => {
  const tokens = accountTokens.readTokens();
  if (!tokens.accessToken) {
    return res.status(401).json({ ok: false, error: "not-signed-in" });
  }
  if (!tokens.syncEnabled) {
    return res.status(400).json({ ok: false, error: "sync-disabled" });
  }
  try {
    const lists = await listsStore.getLists();
    const putRes = await fetch(`${WEBSITE_CHECK_URL}/api/sync/lists`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.accessToken}`
      },
      body: JSON.stringify({
        backup: lists,
        client: "desktop",
        baseUpdatedAt: lists?.updatedAt
      })
    });
    const putData = await putRes.json();
    if (!putRes.ok || !putData?.ok) {
      return res.status(putRes.status).json(putData);
    }
    accountTokens.setLastSyncError(null);
    if (putData.backup) {
      const mod = await listsStore.loadMod();
      const next = await listsStore.writeLists(mod.mergeBackups(lists, putData.backup));
      emitListsUpdate(next);
      return res.json({
        ok: true,
        lists: next,
        merged: putData.merged === true
      });
    }
    return res.json({ ok: true, lists, merged: putData.merged === true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "sync-failed";
    accountTokens.setLastSyncError(msg);
    return res.status(502).json({
      ok: false,
      error: msg
    });
  }
});

app.post("/api/lists/clear", async (_req, res) => {
  const lists = await listsStore.clearListsFile();
  state.emitLists(lists, listsStore.listsPath(), listsStore.listsMtimeMs());
  res.json({ ok: true, lists });
});

/** Support diagnostics: { source, threat_type } only. Client must opt into "share". */
app.post("/api/log", (req, res) => {
  const result = appendAnonymous(req.body);
  if (!result.sent) return res.status(400).json({ ok: false, error: result.reason || "rejected" });
  res.json({ ok: true });
});

// Intentionally no POST /api/log/clear-ring — Clear ring is UI-only until multi-tab sync is needed.

app.post("/api/scan", (req, res) => {
  const raw = String(req.body?.url || "").trim();
  if (!raw) return res.status(400).json({ ok: false, error: "url-required" });
  const target = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  const result = classifyUrl(target);
  const resources = Array.isArray(req.body?.resources)
    ? req.body.resources.filter((u) => typeof u === "string").slice(0, 300)
    : [];
  const thirdPartyTrackers = countThirdPartyTrackers(target, resources);
  let scanKind = result.kind;
  if (result.kind) {
    state.recordBlock({
      kind: result.kind,
      source: "scan",
      display: result.display,
      reason: result.reason
    });
  } else if (thirdPartyTrackers > 0) {
    // Page URL clean but third-party trackers on resources → caution (sameBrandFamily excluded).
    scanKind = "tracker";
    state.recordBlock({
      kind: "tracker",
      source: "scan",
      display: `${thirdPartyTrackers} third-party tracker(s)`,
      reason: "third-party-tracker"
    });
  }
  const snap = state.finishScan(scanKind);
  res.json({
    ok: true,
    result: { ...result, thirdPartyTrackers },
    state: snap
  });
});

/** Classify an arbitrary URL the way the proxy would (used by Scan “probe”). */
app.post("/api/classify", (req, res) => {
  const result = classifyUrl(String(req.body?.url || ""));
  res.json({ ok: true, result });
});

/** Probe website GET /api/health before enabling website-check in the UI. */
app.get("/api/website-health", async (_req, res) => {
  try {
    const healthUrl = `${WEBSITE_CHECK_URL}/api/health?pollMs=${encodeURIComponent(String(WEBSITE_HEALTH_POLL_MS))}`;
    const response = await fetch(healthUrl, {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    const data = await response.json();
    if (!response.ok || !data?.ok) {
      return res.status(502).json({
        ok: false,
        reachable: false,
        error: data?.error || `HTTP ${response.status}`,
        source: WEBSITE_CHECK_URL
      });
    }
    return res.json({
      ok: true,
      reachable: true,
      source: WEBSITE_CHECK_URL,
      probeTimeoutMs: data.probeTimeoutMs,
      ownThreatMergePt: data.ownThreatMergePt,
      pollMs: typeof data.pollMs === "number" ? data.pollMs : WEBSITE_HEALTH_POLL_MS
    });
  } catch (err) {
    return res.status(502).json({
      ok: false,
      reachable: false,
      error: err instanceof Error ? err.message : "website-health-unreachable",
      source: WEBSITE_CHECK_URL
    });
  }
});

/**
 * Proxy to the website POST /api/check and validate analysis.timing
 * against check-timing.schema.json (see TIMING_SCHEMA.md).
 */
app.post("/api/website-check", async (req, res) => {
  const raw = String(req.body?.url || "").trim();
  if (!raw) return res.status(400).json({ ok: false, error: "url-required" });
  try {
    const response = await fetch(`${WEBSITE_CHECK_URL}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: raw, skipHeadHosts: req.body?.skipHeadHosts || [] })
    });
    const data = await response.json();
    if (!response.ok || !data?.ok || !data?.analysis) {
      return res.status(response.status || 502).json({
        ok: false,
        error: data?.error || "website-check-failed",
        timingValid: false
      });
    }
    const timingCheck = validateCheckTiming(data.analysis.timing);
    if (!timingCheck.ok) {
      return res.status(502).json({
        ok: false,
        error: "timing-schema-invalid",
        details: timingCheck.errors,
        timingValid: false
      });
    }
    return res.json({
      ok: true,
      analysis: data.analysis,
      timingValid: true,
      source: WEBSITE_CHECK_URL
    });
  } catch (err) {
    return res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : "website-check-unreachable",
      timingValid: false
    });
  }
});

app.get("/api/machine-scan", (_req, res) => {
  res.json({ ok: true, scan: machineScan.publicView() });
});

app.post("/api/machine-scan/run", (_req, res) => {
  try {
    const scan = machineScan.requestRun();
    res.json({ ok: true, scan });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "scan-failed" });
  }
});

app.post("/api/machine-scan/continue", (_req, res) => {
  try {
    const scan = machineScan.requestContinue();
    res.json({ ok: true, scan });
  } catch (err) {
    const code = err && err.code ? err.code : "continue-failed";
    res.status(code === "nothing-to-continue" ? 409 : 500).json({
      ok: false,
      error: err instanceof Error ? err.message : "continue-failed"
    });
  }
});

app.post("/api/machine-scan/decide", async (req, res) => {
  const choice = req.body?.choice;
  const scanNow = machineScan.publicView();
  if (scanNow.status !== "ready") {
    return res.status(409).json({ ok: false, error: "scan-not-ready", scan: scanNow });
  }
  if (choice !== "block-maximum" && choice !== "decline") {
    return res.status(400).json({ ok: false, error: "choice-required" });
  }
  if (choice === "decline") {
    machineBlock.saveDecision({
      choice,
      findingSetId: scanNow.findingSetId,
      at: new Date().toISOString()
    });
    const scan = machineScan.publicView();
    state.publish("machine", scan);
    return res.json({ ok: true, scan });
  }
  const result = await machineBlock.applyMaximum(machineScan.findingsForBlock());
  if (!result.ok) {
    return res.status(500).json({
      ok: false,
      error: result.errors[0]?.error || result.skipped[0]?.reason || "block-failed",
      result,
      scan: machineScan.publicView()
    });
  }
  machineBlock.saveDecision({
    choice,
    findingSetId: scanNow.findingSetId,
    at: new Date().toISOString(),
    hosts: result.hostsAdded
  });
  if (result.lists) emitListsUpdate(result.lists);
  const scan = machineScan.publicView();
  state.publish("machine", scan);
  return res.json({ ok: true, scan, lists: result.lists, result });
});

app.post("/api/machine-scan/restore", async (_req, res) => {
  const result = await machineBlock.restoreAll();
  if (result.lists) emitListsUpdate(result.lists);
  const scan = machineScan.publicView();
  state.publish("machine", scan);
  res.status(result.ok ? 200 : 500).json({ ok: result.ok, scan, lists: result.lists, result });
});

/** Server-Sent Events — live block feed for the dashboard. */
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const listsFile = listsStore.listsPath();
  res.write(
    `event: hello\ndata: ${JSON.stringify({
      ok: true,
      state: state.snapshot(),
      debounceMs: state.listsEmitDebounceMs(),
      listsPath: listsFile,
      listsPathBasename: path.basename(listsFile),
      listsMtimeMs: listsStore.listsMtimeMs()
    })}\n\n`
  );

  let keepAlive = null;
  const unsubscribe = state.subscribe((evt) => {
    try {
      res.write(`event: ${evt.type}\ndata: ${JSON.stringify(evt)}\n\n`);
      if (evt.type === "bye") {
        if (keepAlive) clearInterval(keepAlive);
        unsubscribe();
        res.end();
      }
    } catch {
      if (keepAlive) clearInterval(keepAlive);
      unsubscribe();
    }
  });

  keepAlive = setInterval(() => {
    try {
      res.write(`: ping ${Date.now()}\n\n`);
    } catch {
      clearInterval(keepAlive);
      unsubscribe();
    }
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    unsubscribe();
  });
});

loadDetector()
  .then(async () => {
    listsStore.startListsWatch();
    listsStore.onListsChange((lists, meta) => {
      state.emitLists(
        lists,
        meta?.path || listsStore.listsPath(),
        meta?.mtimeMs != null ? meta.mtimeMs : listsStore.listsMtimeMs()
      );
      // Optional account push when signed in + Sync lists (debounced by lists watch).
      const tokens = accountTokens.readTokens();
      if (tokens.accessToken && tokens.syncEnabled) {
        void fetch(`${WEBSITE_CHECK_URL}/api/sync/lists`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokens.accessToken}`
          },
          body: JSON.stringify({
            backup: lists,
            client: "desktop",
            baseUpdatedAt: lists?.updatedAt
          })
        })
          .then(async (r) => {
            if (r.ok) {
              accountTokens.setLastSyncError(null);
              return;
            }
            let err = `HTTP ${r.status}`;
            try {
              const body = await r.json();
              if (body?.error) err = String(body.error);
            } catch {
              /* ignore */
            }
            accountTokens.setLastSyncError(err);
          })
          .catch((err) => {
            accountTokens.setLastSyncError(
              err instanceof Error ? err.message : "sync-unreachable"
            );
          });
      }
    });
    const listsMod = await listsStore.loadMod();
    const scanDeps = {
      classify: classifyUrl,
      isTrusted(host) {
        const lists = listsStore.peekCache();
        if (!lists) return false;
        try {
          return listsMod.isDomainTrustedInLists(lists, host);
        } catch {
          return false;
        }
      },
      onUpdate: (scan) => state.publish("machine", scan)
    };
    // First-launch honest-limits gate — ack/skip (or SHIELD_HONEST_LIMITS=0 for smokes) before auto-scan.
    if (autostart.honestLimitsResolved()) {
      machineScan.startAuto(scanDeps);
    } else {
      machineScan.bind(scanDeps);
      console.log("[desktop] Honest limits pending — machine scan waits for ack or skip");
    }

    uiServer = app.listen(UI_PORT, "localhost");
    uiServer.on("error", (err) => {
      if (err && err.code === "EADDRINUSE") {
        console.error(
          `[desktop] localhost:${UI_PORT} is already in use. Close the other Preventive Shield window.`
        );
        process.exit(1);
      }
      console.error("[desktop] dashboard failed", err);
      process.exit(1);
    });
    uiServer.on("listening", () => {
      console.log(`[desktop] Dashboard UI     → http://localhost:${UI_PORT}`);
      console.log(`[desktop] Website check   → ${WEBSITE_CHECK_URL}`);
      console.log(`[desktop] Website origin  ← ${WEBSITE_CHECK_URL_SOURCE}`);
      if (WEBSITE_CHECK_URL_SOURCE.startsWith("fallback")) {
        console.log(`[desktop] Prefer website on http://localhost:3000 (vinext npm run dev)`);
      }

      console.log(`[desktop] Personal lists  → ${listsStore.listsPath()}  (shield-lists-v1; Syncthing-friendly)`);
      proxyServer = startProxy();
      proxyServer.on("error", (err) => {
        if (err && err.code === "EADDRINUSE") {
          console.error(
            `[desktop] 127.0.0.1:${PROXY_PORT} is already in use. Close the other Preventive Shield window.`
          );
          void shutdown().finally(() => process.exit(1));
          return;
        }
        console.error("[desktop] proxy failed", err);
      });
    });
  })
  .catch((err) => {
    console.error("[desktop] failed to load detector", err);
    process.exit(1);
  });
