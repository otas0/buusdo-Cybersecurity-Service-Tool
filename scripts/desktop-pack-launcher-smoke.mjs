/**
 * Boot-smoke launcher.js from a packed desktop app tree (fail if express / boot broken).
 *
 *   SHIELD_PACK_APP_ROOT=desktop-app/dist/macos/Preventive\ Shield.app/Contents/Resources/app \
 *     node scripts/desktop-pack-launcher-smoke.mjs
 *
 * Optional: SHIELD_PACK_NODE=…/Resources/node/bin/node (defaults to process.execPath,
 * or embedded Node next to app when present).
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const appRoot = path.resolve(
  (process.env.SHIELD_PACK_APP_ROOT || "").trim() ||
    "desktop-app/dist/macos/Preventive Shield.app/Contents/Resources/app"
);
const launcher = path.join(appRoot, "src/launcher.js");
const expressPkg = path.join(appRoot, "node_modules/express/package.json");

function fail(msg) {
  console.error(`desktop-pack-launcher-smoke: ${msg}`);
  process.exit(1);
}

if (!existsSync(launcher)) fail(`launcher missing: ${launcher}`);
if (!existsSync(expressPkg)) fail(`express missing under pack: ${appRoot}`);

// .app layout: Contents/Resources/{app,node,shared}
const embeddedNode = path.join(appRoot, "..", "node", "bin", "node");
const nodeBin =
  (process.env.SHIELD_PACK_NODE || "").trim() ||
  (existsSync(embeddedNode) ? embeddedNode : process.execPath);

const data = await mkdtemp(path.join(tmpdir(), "shield-pack-launcher-"));
// Ephemeral ports avoid colliding with a leftover local pack smoke / dashboard.
const uiPort = Number(process.env.UI_PORT || 32000 + Math.floor(Math.random() * 2000));
const proxyPort = Number(process.env.PROXY_PORT || uiPort + 1);

const child = spawn(nodeBin, [launcher], {
  cwd: appRoot,
  env: {
    ...process.env,
    UI_PORT: String(uiPort),
    PROXY_PORT: String(proxyPort),
    SHIELD_DATA_DIR: data,
    SHIELD_SHARED_ROOT:
      process.env.SHIELD_SHARED_ROOT ||
      (existsSync(path.join(appRoot, "..", "shared"))
        ? path.join(appRoot, "..", "shared")
        : path.resolve("shared")),
    SHIELD_LAUNCHER_NO_BROWSER: "1",
    SHIELD_MACHINE_SCAN: "0",
    SHIELD_TRAY: "0",
    SHIELD_QUIT_GRACE_MS: process.env.SHIELD_QUIT_GRACE_MS || "0",
    SHIELD_HONEST_LIMITS: process.env.SHIELD_HONEST_LIMITS || "0"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let log = "";
child.stdout.on("data", (chunk) => {
  log += String(chunk);
});
child.stderr.on("data", (chunk) => {
  log += String(chunk);
});

try {
  let ready = false;
  for (let i = 0; i < 80; i += 1) {
    if (child.exitCode != null) {
      fail(`launcher exited early code=${child.exitCode}: ${log.slice(0, 1200)}`);
    }
    try {
      // Prefer localhost (macOS may bind ::1 only; 127.0.0.1 then refuses).
      const res = await fetch(`http://localhost:${uiPort}/api/state`);
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {
      /* waiting */
    }
    await delay(100);
  }
  if (!ready) fail(`launcher did not serve /api/state: ${log.slice(0, 1200)}`);
  console.log(`ok pack launcher boot: ${appRoot} (node=${nodeBin})`);
} finally {
  child.kill("SIGTERM");
  await delay(400);
  if (child.exitCode == null) child.kill("SIGKILL");
  await rm(data, { recursive: true, force: true });
}
