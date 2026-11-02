import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);

function loadFresh(rel: string) {
  const abs = require.resolve(rel);
  delete require.cache[abs];
  return require(abs);
}

test("default data dir is under the user profile, not the repo or Electron userData", () => {
  const dir = mkdtempSync(join(tmpdir(), "shield-user-data-"));
  process.env.SHIELD_DATA_DIR = dir;
  try {
    const userData = loadFresh("../desktop-app/src/user-data.js");
    assert.equal(userData.defaultDataDir(), dir);
    const lists = loadFresh("../desktop-app/src/lists-store.js");
    assert.equal(lists.listsPath(), join(dir, "shield-backup.json"));
    assert.equal(lists.listsPath().includes("node_modules"), false);
    assert.equal(lists.listsPath().endsWith("desktop-app/data/shield-backup.json"), false);
  } finally {
    delete process.env.SHIELD_DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("open at login stays off until set, then clears the login item when disabled", () => {
  const dir = mkdtempSync(join(tmpdir(), "shield-autostart-"));
  const loginItem = join(dir, "login-item");
  process.env.SHIELD_DATA_DIR = dir;
  process.env.SHIELD_AUTOSTART_PATH = loginItem;
  try {
    const autostart = loadFresh("../desktop-app/src/autostart.js");
    assert.equal(autostart.getOpenAtLogin().openAtLogin, false);
    assert.equal(existsSync(autostart.settingsPath()), false);

    const on = autostart.setOpenAtLogin(true);
    assert.equal(on.settings.openAtLogin, true);
    assert.equal(on.applied.enabled, true);
    if (process.platform !== "win32") assert.equal(existsSync(loginItem), true);
    const settings = JSON.parse(readFileSync(autostart.settingsPath(), "utf8"));
    assert.equal(settings.openAtLogin, true);

    const off = autostart.setOpenAtLogin(false);
    assert.equal(off.settings.openAtLogin, false);
    assert.equal(off.applied.enabled, false);
    if (process.platform !== "win32") assert.equal(existsSync(loginItem), false);
  } finally {
    delete process.env.SHIELD_DATA_DIR;
    delete process.env.SHIELD_AUTOSTART_PATH;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("silent install prepares data dir and never leaves openAtLogin on", () => {
  const dir = mkdtempSync(join(tmpdir(), "shield-silent-"));
  const loginItem = join(dir, "login-item");
  process.env.SHIELD_DATA_DIR = dir;
  process.env.SHIELD_AUTOSTART_PATH = loginItem;
  try {
    writeFileSync(loginItem, "stale\n");
    const { silentInstall } = loadFresh("../desktop-app/src/install.js");
    const result = silentInstall();
    assert.equal(result.ok, true);
    assert.equal(result.openAtLogin, false);
    assert.equal(result.dataDir, dir);
    assert.equal(existsSync(loginItem), false);
    assert.equal(existsSync(join(dir, "install.json")), true);
    assert.equal(existsSync(join(dir, "settings.json")), true);
  } finally {
    delete process.env.SHIELD_DATA_DIR;
    delete process.env.SHIELD_AUTOSTART_PATH;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("instance lock rejects a second acquire while another pid holds the file", () => {
  const dir = mkdtempSync(join(tmpdir(), "shield-lock-"));
  process.env.SHIELD_DATA_DIR = dir;
  try {
    const { writeFileSync } = require("node:fs");
    const lock = loadFresh("../desktop-app/src/instance-lock.js");
    const holderPid = process.platform === "win32" ? 4 : 1;
    writeFileSync(lock.lockPath(), `${holderPid}\n`, "utf8");
    const blocked = lock.tryAcquire();
    assert.equal(blocked.ok, false);
    assert.equal(blocked.reason, "other-instance");
    writeFileSync(lock.lockPath(), "99999999\n", "utf8");
    const stale = lock.tryAcquire();
    assert.equal(stale.ok, true);
    lock.release();
  } finally {
    delete process.env.SHIELD_DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("instance lock reclaims when PID looks live but ports are free (SIGKILL leftover)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "shield-lock-reclaim-"));
  process.env.SHIELD_DATA_DIR = dir;
  try {
    const { writeFileSync } = require("node:fs");
    const lock = loadFresh("../desktop-app/src/instance-lock.js");
    const holderPid = process.platform === "win32" ? 4 : 1;
    writeFileSync(lock.lockPath(), `${holderPid}\n`, "utf8");
    const reclaimed = await lock.tryAcquireOrReclaimStale({ uiPort: 39991, proxyPort: 39992 });
    assert.equal(reclaimed.ok, true);
    lock.release();
  } finally {
    delete process.env.SHIELD_DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  }
});