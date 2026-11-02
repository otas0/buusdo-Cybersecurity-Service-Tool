/**
 * Launcher smoke: single-instance lock, Quit releases ports.
 * Uses a temp data dir — never the real user Application Support folder.
 */

import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const data = await mkdtemp(path.join(tmpdir(), "shield-launcher-smoke-"));
const uiPort = 32121;
const proxyPort = 32122;
const root = path.resolve("desktop-app");

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" }, () => {
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

function startLauncher() {
  return spawn(process.execPath, ["src/launcher.js"], {
    cwd: root,
    env: {
      ...process.env,
      UI_PORT: String(uiPort),
      PROXY_PORT: String(proxyPort),
      SHIELD_DATA_DIR: data,
      SHIELD_LAUNCHER_NO_BROWSER: "1",
      SHIELD_MACHINE_SCAN: "0",
      SHIELD_TRAY: "0",
      SHIELD_QUIT_GRACE_MS: process.env.SHIELD_QUIT_GRACE_MS || "0"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function fail(message) {
  throw new Error(message);
}

const child = startLauncher();
try {
  let ready = false;
  for (let i = 0; i < 60; i += 1) {
    try {
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
  if (!ready) fail("launcher did not serve /api/state");

  const second = startLauncher();
  let secondExit = null;
  second.on("exit", (code) => {
    secondExit = code;
  });
  await delay(800);
  if (secondExit === null) {
    second.kill("SIGTERM");
    fail("second launcher should exit after deferring to the first instance");
  }

  const quit = await fetch(`http://localhost:${uiPort}/api/quit`, { method: "POST" });
  if (!quit.ok) fail("quit failed");
  await delay(1000);
  let stillUp = false;
  try {
    stillUp = (await fetch(`http://localhost:${uiPort}/api/state`, { signal: AbortSignal.timeout(500) })).ok;
  } catch {
    stillUp = false;
  }
  if (stillUp) fail("ui still answering after quit");
  // Proxy binds 127.0.0.1; UI may be localhost/::1 — check the proxy IPv4 socket.
  if (await portOpen(proxyPort)) fail("proxy port still open after quit");
  console.log("desktop launcher smoke ok");
} finally {
  child.kill("SIGTERM");
  await delay(200);
  await rm(data, { recursive: true, force: true });
}