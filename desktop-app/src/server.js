/**
 * Preventive Shield — Desktop App (Part 2)
 * -----------------------------------------
 * - Express dashboard UI on http://localhost:3010 (UI_PORT; website uses :3000)
 * - Educational HTTP proxy on http://127.0.0.1:8080
 *
 * Aligns visually with the Chrome extension (Part 1).
 */

const path = require("path");
const express = require("express");
const state = require("./state");
const { appendAnonymous } = require("./log-store");
const { classifyUrl, countThirdPartyTrackers, loadDetector } = require("./threats");
const { startProxy, PROXY_PORT } = require("./proxy-server");
const { validateCheckTiming } = require("./validate-timing");
const listsStore = require("./lists-store");
const accountTokens = require("./account-tokens");

/** Default 3010 so vinext website can keep :3000. Override with UI_PORT. */
const UI_PORT = Number(process.env.UI_PORT || 3010);
/** First-party website check API (no third-party reputation). */
/** Prefer env; else shared/production-site.json after deploy; else localhost vinext. */
function defaultWebsiteCheckUrl() {
  try {
    const site = require(path.join(__dirname, "..", "..", "shared", "production-site.json"));
    const origin = String(site?.productionOrigin || "")
      .trim()
      .replace(/\/$/, "");
    if (origin) return origin;
  } catch {
    /* empty */
  }
  return "http://localhost:3000";
}
const WEBSITE_CHECK_URL = String(process.env.WEBSITE_CHECK_URL || defaultWebsiteCheckUrl()).replace(
  /\/$/,
  ""
);
/** Dashboard poll interval for GET /api/website-health (ms). Min 5s. */
const WEBSITE_HEALTH_POLL_MS = Math.max(
  5000,
  Number(process.env.WEBSITE_HEALTH_POLL_MS || 15_000) || 15_000
);
const ROOT = path.join(__dirname, "..");
const SHARED = path.join(__dirname, "..", "..", "shared");

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

// Shared tokens for both surfaces
app.use("/shared", express.static(SHARED));
app.use(express.static(path.join(ROOT, "public")));

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
    lists
  });
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

/**
 * Reveal shield-backup.json in Finder/Explorer when Electron shell is present
 * (`npm run electron` → global.__shieldElectronShell or require("electron").shell).
 */
app.post("/api/lists/reveal", async (_req, res) => {
  const file = listsStore.listsPath();
  /** @type {{ openPath?: (p: string) => Promise<string> } | null} */
  let shellApi = global.__shieldElectronShell || null;
  if (!shellApi && typeof process.versions?.electron === "string") {
    try {
      // eslint-disable-next-line import/no-unresolved -- optional Electron runtime
      shellApi = require("electron").shell;
    } catch {
      shellApi = null;
    }
  }
  if (shellApi?.openPath) {
    try {
      const err = await shellApi.openPath(file);
      if (!err) return res.json({ ok: true, path: file, via: "electron" });
      return res.status(500).json({ ok: false, error: err, path: file });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : "reveal-failed",
        path: file
      });
    }
  }
  res.json({
    ok: false,
    deferred: true,
    path: file,
    hint: "Run desktop-app with npm run electron (after npm i -D electron) for shell.openPath."
  });
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

  const unsubscribe = state.subscribe((evt) => {
    res.write(`event: ${evt.type}\ndata: ${JSON.stringify(evt)}\n\n`);
  });

  const keepAlive = setInterval(() => {
    res.write(`: ping ${Date.now()}\n\n`);
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    unsubscribe();
  });
});

loadDetector()
  .then(() => {
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
    app.listen(UI_PORT, "localhost", () => {
      console.log(`[desktop] Dashboard UI     → http://localhost:${UI_PORT}`);
      console.log(`[desktop] Website check   → ${WEBSITE_CHECK_URL}  (WEBSITE_CHECK_URL)`);
      console.log(`[desktop] Prefer website on http://localhost:3000 (vinext npm run dev)`);
      console.log(`[desktop] Personal lists  → ${listsStore.listsPath()}  (shield-lists-v1; Syncthing-friendly)`);
      startProxy();
    });
  })
  .catch((err) => {
    console.error("[desktop] failed to load detector", err);
    process.exit(1);
  });