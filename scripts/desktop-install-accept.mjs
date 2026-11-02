/**
 * Installer acceptance checklist (automated, temp data dir):
 *   - silent install does not create a login item
 *   - real LaunchAgents path stays absent on the test account (macOS)
 *   - first launch starts a machine scan
 *   - Quit frees UI + proxy ports
 *
 *   npm run smoke:desktop-install-accept
 *
 * If this developer machine already has the product LaunchAgent from a manual
 * open-at-login toggle, set SHIELD_ALLOW_EXISTING_LAUNCH_AGENT=1 to skip that assert.
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const data = await mkdtemp(path.join(os.tmpdir(), "shield-install-accept-"));
const loginItem = path.join(data, "login-item-should-not-exist");
const uiPort = 32151;
const proxyPort = 32152;
const root = path.resolve("desktop-app");
const macAgent = path.join(os.homedir(), "Library", "LaunchAgents", "pt.preventiveshield.desktop.plist");
const linuxDesktop = path.join(os.homedir(), ".config", "autostart", "preventive-shield.desktop");

function fail(message) {
  throw new Error(message);
}

function portOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.setTimeout(300, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

const env = {
  ...process.env,
  UI_PORT: String(uiPort),
  PROXY_PORT: String(proxyPort),
  SHIELD_DATA_DIR: data,
  SHIELD_AUTOSTART_PATH: loginItem,
  SHIELD_LAUNCHER_NO_BROWSER: "1",
  SHIELD_MACHINE_SCAN_MAX_FILES: "30",
  SHIELD_MACHINE_SCAN_SYSTEM: "0",
  SHIELD_HONEST_LIMITS: "0",
  SHIELD_TRAY: "0",
  SHIELD_QUIT_GRACE_MS: process.env.SHIELD_QUIT_GRACE_MS || "0"
};

const install = spawn(process.execPath, ["src/launcher.js", "--install"], {
  cwd: root,
  env,
  stdio: ["ignore", "pipe", "pipe"]
});
await new Promise((resolve, reject) => {
  install.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`install exit ${code}`))));
});

if (existsSync(loginItem)) fail("silent install wrote a login item");

if (process.env.SHIELD_ALLOW_EXISTING_LAUNCH_AGENT !== "1") {
  if (process.platform === "darwin" && existsSync(macAgent)) {
    fail(
      `real LaunchAgent present at ${macAgent} — test accounts must not have open-at-login enabled (or set SHIELD_ALLOW_EXISTING_LAUNCH_AGENT=1)`
    );
  }
  if (process.platform === "linux" && existsSync(linuxDesktop)) {
    fail(
      `real autostart desktop present at ${linuxDesktop} — test accounts must not have open-at-login enabled (or set SHIELD_ALLOW_EXISTING_LAUNCH_AGENT=1)`
    );
  }
}

const child = spawn(process.execPath, ["src/launcher.js"], {
  cwd: root,
  env,
  stdio: ["ignore", "pipe", "pipe"]
});

try {
  let scan = null;
  for (let i = 0; i < 80; i += 1) {
    try {
      const state = await fetch(`http://localhost:${uiPort}/api/state`).then((r) => r.json());
      if (state?.settings?.openAtLogin) fail("openAtLogin should stay false after install");
      scan = await fetch(`http://localhost:${uiPort}/api/machine-scan`).then((r) => r.json());
      if (scan?.scan?.status === "scanning" || scan?.scan?.status === "ready") break;
    } catch {
      /* wait */
    }
    await delay(150);
  }
  if (!scan?.scan || (scan.scan.status !== "scanning" && scan.scan.status !== "ready")) {
    fail(`first open did not scan: ${scan?.scan?.status || "none"}`);
  }

  // Served index must carry package.json asset ?v= (tray cache bust).
  const pkgVersion = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version;
  const indexHtml = await fetch(`http://localhost:${uiPort}/`).then((r) => r.text());
  if (!indexHtml.includes(`dashboard.css?v=${pkgVersion}`)) {
    fail(`served index missing dashboard.css?v=${pkgVersion}`);
  }
  if (!indexHtml.includes(`dashboard.js?v=${pkgVersion}`)) {
    fail(`served index missing dashboard.js?v=${pkgVersion}`);
  }
  const sourceIndex = readFileSync(path.join(root, "public", "index.html"), "utf8");
  if (!/\?v=/.test(sourceIndex)) {
    fail("public/index.html asset URLs must include ?v= (server rewrites to package version)");
  }

  const quit = await fetch(`http://localhost:${uiPort}/api/quit`, { method: "POST" });
  if (!quit.ok) fail("quit failed");
  await delay(1200);

  let stillUp = false;
  try {
    stillUp = (await fetch(`http://localhost:${uiPort}/api/state`, { signal: AbortSignal.timeout(400) })).ok;
  } catch {
    stillUp = false;
  }
  if (stillUp) fail("ui still up after quit");
  if (await portOpen(proxyPort)) fail("proxy still listening after quit");
  if (existsSync(loginItem)) fail("login item appeared during run");
  if (process.env.SHIELD_ALLOW_EXISTING_LAUNCH_AGENT !== "1") {
    if (process.platform === "darwin" && existsSync(macAgent)) fail("LaunchAgent appeared after quit");
    if (process.platform === "linux" && existsSync(linuxDesktop)) fail("autostart desktop appeared after quit");
  }
  console.log("desktop install accept ok");
} finally {
  child.kill("SIGTERM");
  await delay(200);
  await rm(data, { recursive: true, force: true });
}
