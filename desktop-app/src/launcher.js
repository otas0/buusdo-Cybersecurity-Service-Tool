/**
 * Preventive Shield launcher — no Chromium shell required.
 *
 *   node src/launcher.js
 *   node src/launcher.js --install   # silent install; never writes login items
 *
 * Acquires the single-instance lock, starts the dashboard + proxy, opens the
 * system browser, and quits from the tray item (when available), the dashboard
 * Quit control, or Ctrl+C. Closing a browser tab does not stop the process.
 */

const { spawn } = require("child_process");
const http = require("http");
const path = require("path");
const { ensureDataDir, PRODUCT } = require("./user-data");
const lock = require("./instance-lock");
const { quitGraceMs } = require("./quit-grace");

const UI_PORT = Number(process.env.UI_PORT || 3010);
const PROXY_PORT = Number(process.env.PROXY_PORT || 8080);
const DASHBOARD = `http://localhost:${UI_PORT}`;
const DASHBOARD_FOCUS = `${DASHBOARD}/#machineScan`;

let shuttingDown = false;
let tray = null;

function openBrowser(url) {
  if (process.env.SHIELD_LAUNCHER_NO_BROWSER === "1") {
    console.log(`[desktop] Browser open skipped → ${url}`);
    return;
  }
  if (process.platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
}

function waitForDashboard(timeoutMs = 20000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`${DASHBOARD}/api/state`, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) return resolve();
        retry();
      });
      req.on("error", retry);
      req.setTimeout(800, () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() - started > timeoutMs) {
        reject(new Error("dashboard-timeout"));
        return;
      }
      setTimeout(tick, 150);
    };
    tick();
  });
}

async function stopAll() {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    if (tray && typeof tray.kill === "function") tray.kill();
  } catch {
    /* tray optional */
  }
  // Let SSE clients receive `bye` before sockets close (SHIELD_QUIT_GRACE_MS).
  await new Promise((resolve) => setTimeout(resolve, quitGraceMs()));
  try {
    const { shutdown } = require("./server");
    await shutdown();
  } catch {
    /* server may not have exported yet */
  }
  lock.release();
  process.exit(0);
}

function attachSignals() {
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => {
      void stopAll();
    });
  }
}

function ensureSystrayBinExecutable() {
  const fs = require("fs");
  const os = require("os");
  const candidates = [];
  try {
    const pkgDir = path.dirname(require.resolve("systray2/package.json"));
    const traybin = path.join(pkgDir, "traybin");
    for (const name of fs.readdirSync(traybin)) {
      candidates.push(path.join(traybin, name));
    }
  } catch {
    /* package absent or no traybin */
  }
  const cacheRoot = path.join(os.homedir(), ".cache", "node-systray");
  try {
    for (const ver of fs.readdirSync(cacheRoot)) {
      const dir = path.join(cacheRoot, ver);
      try {
        for (const name of fs.readdirSync(dir)) {
          if (name.startsWith("tray_")) candidates.push(path.join(dir, name));
        }
      } catch {
        /* skip */
      }
    }
  } catch {
    /* no cache yet */
  }
  for (const file of candidates) {
    try {
      fs.chmodSync(file, 0o755);
    } catch {
      /* best-effort: quarantine xattrs / EPERM must not block launch */
    }
  }
}

function startTray() {
  if (process.env.SHIELD_TRAY === "0" || process.env.SHIELD_TRAY === "off") {
    global.__shieldTrayAvailable = false;
    console.log(`[desktop] Tray skipped (SHIELD_TRAY=0) — use Quit in the dashboard.`);
    return null;
  }
  let SysTray;
  try {
    SysTray = require("systray2").default || require("systray2");
  } catch {
    console.log(`[desktop] Tray package not installed — use Quit in the dashboard or Ctrl+C.`);
    global.__shieldTrayAvailable = false;
    return null;
  }
  // Race fix: systray2 copies then chmod async — ensure +x before spawn.
  ensureSystrayBinExecutable();
  const assetsDir = path.join(__dirname, "..", "assets");
  const iconPath =
    process.platform === "win32"
      ? path.join(assetsDir, "tray-icon.ico")
      : process.platform === "darwin"
        ? path.join(assetsDir, "tray-icon-template.png")
        : path.join(assetsDir, "tray-icon.png");
  const fs = require("fs");
  const hasIcon = fs.existsSync(iconPath);
  let item;
  try {
    item = new SysTray({
      menu: {
        icon: hasIcon ? iconPath : "",
        isTemplateIcon: process.platform === "darwin" && hasIcon,
        title: PRODUCT,
        tooltip: `${PRODUCT} — Open dashboard / Quit`,
        items: [
          { title: "Open dashboard", tooltip: DASHBOARD_FOCUS, checked: false, enabled: true },
          { title: "Quit", tooltip: "Stop dashboard and proxy", checked: false, enabled: true }
        ]
      },
      debug: false,
      copyDir: true
    });
  } catch (err) {
    global.__shieldTrayAvailable = false;
    console.log(
      `[desktop] Tray failed to start — ${err instanceof Error ? err.message : err}. Use Quit in the dashboard.`
    );
    return null;
  }
  // systray2 spawns async; EACCES / missing +x must not take down the UI + proxy.
  void Promise.resolve(item.ready?.())
    .then(() => {
      ensureSystrayBinExecutable();
      global.__shieldTrayAvailable = true;
      console.log(
        `[desktop] Tray ready (${hasIcon ? "icon" : "title-only"}) — ${PRODUCT}`
      );
    })
    .catch((err) => {
      global.__shieldTrayAvailable = false;
      console.log(
        `[desktop] Tray binary unavailable — ${err instanceof Error ? err.message : err}. Use Quit in the dashboard.`
      );
      try {
        item.kill?.();
      } catch {
        /* ignore */
      }
    });
  item.onClick((action) => {
    if (action?.item?.title === "Open dashboard") openBrowser(DASHBOARD_FOCUS);
    // Quit stops UI/proxy only — never clears settings.json honest-limits ack/skip.
    if (action?.item?.title === "Quit") void stopAll();
  });
  const child = item.process;
  if (child && typeof child.on === "function") {
    child.on("error", (err) => {
      global.__shieldTrayAvailable = false;
      console.log(
        `[desktop] Tray process error — ${err instanceof Error ? err.message : err}. Dashboard stays up.`
      );
    });
  }
  // Optimistic until ready()/error settles — footer uses API trayAvailable.
  global.__shieldTrayAvailable = true;
  return item;
}

function handOffToRunningInstance() {
  console.log(`[desktop] Already running — opening ${DASHBOARD_FOCUS}`);
  openBrowser(DASHBOARD_FOCUS);
  process.exit(0);
}

async function main() {
  if (process.argv.includes("--install") || process.argv.includes("install")) {
    const { silentInstall } = require("./install");
    const result = silentInstall();
    console.log(`[desktop] Silent install ok → ${result.dataDir}`);
    console.log(`[desktop] Open at login → off`);
    process.exit(0);
  }

  ensureDataDir();
  const acquired = await lock.tryAcquireOrReclaimStale({ uiPort: UI_PORT, proxyPort: PROXY_PORT });
  if (!acquired.ok) {
    const uiBusy =
      (await lock.portOpen(UI_PORT, "127.0.0.1")) || (await lock.portOpen(UI_PORT, "::1"));
    if (uiBusy || acquired.reason === "other-instance") {
      handOffToRunningInstance();
    }
    console.error(`[desktop] Could not take instance lock: ${acquired.reason}`);
    process.exit(1);
  }

  if ((await lock.portOpen(UI_PORT, "127.0.0.1")) || (await lock.portOpen(PROXY_PORT))) {
    lock.release();
    handOffToRunningInstance();
  }

  attachSignals();
  process.on("exit", () => lock.release());

  // Side-effect: server.js binds UI + proxy and starts the machine scan.
  require("./server");
  global.__shieldQuit = () => {
    void stopAll();
  };

  try {
    await waitForDashboard();
  } catch (err) {
    console.error("[desktop] Dashboard did not start", err instanceof Error ? err.message : err);
    lock.release();
    process.exit(1);
  }

  openBrowser(DASHBOARD_FOCUS);
  tray = startTray();
  console.log(`[desktop] Launcher ready — ${DASHBOARD_FOCUS} (proxy :${PROXY_PORT})`);
  console.log(`[desktop] Data directory → ${ensureDataDir()}`);
}

main().catch((err) => {
  console.error("[desktop] launcher failed", err);
  lock.release();
  process.exit(1);
});