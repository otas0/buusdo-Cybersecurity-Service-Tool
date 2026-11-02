/**
 * Honest-limits settings + diagnostics export (no URLs / no list hosts).
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
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

test("honest limits ack/skip/reset are reversible in settings.json", () => {
  const dir = mkdtempSync(join(tmpdir(), "shield-honest-"));
  process.env.SHIELD_DATA_DIR = dir;
  delete process.env.SHIELD_HONEST_LIMITS;
  try {
    const autostart = loadFresh("../desktop-app/src/autostart.js");
    assert.equal(autostart.honestLimitsResolved(), false);
    const ack = autostart.setHonestLimitsAck();
    assert.ok(ack.honestLimitsAckAt);
    assert.equal(ack.honestLimitsSkippedAt, null);
    assert.equal(autostart.honestLimitsResolved(), true);
    const skip = autostart.setHonestLimitsSkip();
    assert.ok(skip.honestLimitsSkippedAt);
    assert.equal(skip.honestLimitsAckAt, null);
    const cleared = autostart.clearHonestLimits();
    assert.equal(cleared.honestLimitsAckAt, null);
    assert.equal(cleared.honestLimitsSkippedAt, null);
    assert.equal(autostart.honestLimitsResolved(), false);
    // openAtLogin merge preserved across honest-limits writes
    autostart.writeSettings({ openAtLogin: true });
    autostart.setHonestLimitsAck();
    const settings = JSON.parse(readFileSync(autostart.settingsPath(), "utf8"));
    assert.equal(settings.openAtLogin, true);
    assert.ok(settings.honestLimitsAckAt);
  } finally {
    delete process.env.SHIELD_DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("SHIELD_HONEST_LIMITS=0 bypasses the gate", () => {
  const dir = mkdtempSync(join(tmpdir(), "shield-honest-bypass-"));
  process.env.SHIELD_DATA_DIR = dir;
  process.env.SHIELD_HONEST_LIMITS = "0";
  try {
    const autostart = loadFresh("../desktop-app/src/autostart.js");
    assert.equal(autostart.honestLimitsResolved(), true);
  } finally {
    delete process.env.SHIELD_DATA_DIR;
    delete process.env.SHIELD_HONEST_LIMITS;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("setOpenAtLogin never drops honestLimitsAckAt", () => {
  const dir = mkdtempSync(join(tmpdir(), "shield-honest-merge-"));
  const loginItem = join(dir, "login-item");
  process.env.SHIELD_DATA_DIR = dir;
  process.env.SHIELD_AUTOSTART_PATH = loginItem;
  delete process.env.SHIELD_HONEST_LIMITS;
  try {
    const autostart = loadFresh("../desktop-app/src/autostart.js");
    const ack = autostart.setHonestLimitsAck();
    assert.ok(ack.honestLimitsAckAt);
    const stamped = ack.honestLimitsAckAt;
    const on = autostart.setOpenAtLogin(true);
    assert.equal(on.settings.openAtLogin, true);
    assert.equal(on.settings.honestLimitsAckAt, stamped);
    const off = autostart.setOpenAtLogin(false);
    assert.equal(off.settings.openAtLogin, false);
    assert.equal(off.settings.honestLimitsAckAt, stamped);
    const disk = JSON.parse(readFileSync(autostart.settingsPath(), "utf8"));
    assert.equal(disk.honestLimitsAckAt, stamped);
  } finally {
    delete process.env.SHIELD_DATA_DIR;
    delete process.env.SHIELD_AUTOSTART_PATH;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("silent install merge preserves honestLimitsAckAt", () => {
  const dir = mkdtempSync(join(tmpdir(), "shield-install-honest-"));
  const loginItem = join(dir, "login-item");
  process.env.SHIELD_DATA_DIR = dir;
  process.env.SHIELD_AUTOSTART_PATH = loginItem;
  delete process.env.SHIELD_HONEST_LIMITS;
  try {
    const autostart = loadFresh("../desktop-app/src/autostart.js");
    const ack = autostart.setHonestLimitsAck();
    const stamped = ack.honestLimitsAckAt;
    assert.ok(stamped);
    const { silentInstall } = loadFresh("../desktop-app/src/install.js");
    const result = silentInstall();
    assert.equal(result.ok, true);
    assert.equal(result.openAtLogin, false);
    const settings = JSON.parse(readFileSync(autostart.settingsPath(), "utf8"));
    assert.equal(settings.honestLimitsAckAt, stamped);
  } finally {
    delete process.env.SHIELD_DATA_DIR;
    delete process.env.SHIELD_AUTOSTART_PATH;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("honest-limits pending survives quit-shaped relaunch (settings untouched)", () => {
  const dir = mkdtempSync(join(tmpdir(), "shield-honest-quit-"));
  process.env.SHIELD_DATA_DIR = dir;
  delete process.env.SHIELD_HONEST_LIMITS;
  try {
    const autostart = loadFresh("../desktop-app/src/autostart.js");
    assert.equal(autostart.honestLimitsResolved(), false);
    // Quit / tray stopAll must not write settings — only ensureDataDir exists.
    // Simulate relaunch by reloading the module against the same data dir.
    const again = loadFresh("../desktop-app/src/autostart.js");
    assert.equal(again.honestLimitsResolved(), false);
    assert.equal(again.readSettings().honestLimitsAckAt, null);
    assert.equal(again.readSettings().honestLimitsSkippedAt, null);
  } finally {
    delete process.env.SHIELD_DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("diagnostics export has no URLs and no list hostnames", () => {
  const dir = mkdtempSync(join(tmpdir(), "shield-diag-"));
  process.env.SHIELD_DATA_DIR = dir;
  try {
    const diag = loadFresh("../desktop-app/src/diagnostics-export.js");
    const result = diag.writeDiagnosticsExport({
      settings: { openAtLogin: false, honestLimitsAckAt: "2026-01-01T00:00:00.000Z" },
      ports: { ui: 3010, proxy: 8080 },
      machineStatus: "idle",
      listsCounts: { blocked: 2, trusted: 1 },
      quarantineCount: 0,
      privacyMode: "off"
    });
    assert.equal(result.ok, true);
    assert.equal(existsSync(result.path), true);
    const raw = readFileSync(result.path, "utf8");
    assert.equal(/https?:\/\//i.test(raw), false);
    assert.doesNotMatch(raw, /evil\.example|google-analytics|blocked\.host/i);
    assert.match(raw, /shield-diagnostics-v1/);
    assert.match(raw, /"blocked": 2/);
    assert.match(raw, /No checked addresses/);
  } finally {
    delete process.env.SHIELD_DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  }
});