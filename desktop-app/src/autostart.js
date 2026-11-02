/**
 * Open-at-login is off by default. Only write OS login items when the user
 * turns the setting on; turning it off removes those files.
 *
 * Also stores first-launch honest-limits ack/skip (reversible).
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { ensureDataDir, PRODUCT, PRODUCT_SLUG } = require("./user-data");

const SETTINGS_NAME = "settings.json";

function settingsPath() {
  return path.join(ensureDataDir(), SETTINGS_NAME);
}

function isoOrNull(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function readSettings() {
  try {
    const data = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
    return {
      openAtLogin: data?.openAtLogin === true,
      honestLimitsAckAt: isoOrNull(data?.honestLimitsAckAt),
      honestLimitsSkippedAt: isoOrNull(data?.honestLimitsSkippedAt)
    };
  } catch {
    return {
      openAtLogin: false,
      honestLimitsAckAt: null,
      honestLimitsSkippedAt: null
    };
  }
}

function writeSettings(patch) {
  const prev = readSettings();
  const merged = {
    openAtLogin:
      typeof patch.openAtLogin === "boolean" ? patch.openAtLogin : prev.openAtLogin,
    honestLimitsAckAt:
      patch.honestLimitsAckAt === undefined
        ? prev.honestLimitsAckAt
        : isoOrNull(patch.honestLimitsAckAt),
    honestLimitsSkippedAt:
      patch.honestLimitsSkippedAt === undefined
        ? prev.honestLimitsSkippedAt
        : isoOrNull(patch.honestLimitsSkippedAt)
  };
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  return merged;
}

/** Env bypass for CI/smokes — never set in production installers. */
function honestLimitsEnvBypass() {
  return process.env.SHIELD_HONEST_LIMITS === "0";
}

function honestLimitsResolved(settings = readSettings()) {
  if (honestLimitsEnvBypass()) return true;
  return Boolean(settings.honestLimitsAckAt || settings.honestLimitsSkippedAt);
}

function setHonestLimitsAck() {
  return writeSettings({
    honestLimitsAckAt: new Date().toISOString(),
    honestLimitsSkippedAt: null
  });
}

function setHonestLimitsSkip() {
  return writeSettings({
    honestLimitsSkippedAt: new Date().toISOString(),
    honestLimitsAckAt: null
  });
}

/** Reversible — show the first-launch gate again. */
function clearHonestLimits() {
  return writeSettings({
    honestLimitsAckAt: null,
    honestLimitsSkippedAt: null
  });
}

function launchCommand() {
  if (process.env.SHIELD_LAUNCH_COMMAND) return process.env.SHIELD_LAUNCH_COMMAND;
  const launcher = path.resolve(__dirname, "launcher.js");
  return `${process.execPath} ${JSON.stringify(launcher)}`;
}

function macPlistPath() {
  if (process.env.SHIELD_AUTOSTART_PATH) return path.resolve(process.env.SHIELD_AUTOSTART_PATH);
  return path.join(os.homedir(), "Library", "LaunchAgents", `pt.preventiveshield.desktop.plist`);
}

function linuxDesktopPath() {
  if (process.env.SHIELD_AUTOSTART_PATH) return path.resolve(process.env.SHIELD_AUTOSTART_PATH);
  return path.join(os.homedir(), ".config", "autostart", `${PRODUCT_SLUG}.desktop`);
}

function winRunKey() {
  return "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
}

function applyOpenAtLogin(enabled) {
  if (process.platform === "darwin") {
    const plist = macPlistPath();
    if (!enabled) {
      try {
        fs.unlinkSync(plist);
      } catch {
        /* missing ok */
      }
      return { ok: true, path: plist, enabled: false };
    }
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>pt.preventiveshield.desktop</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>${launchCommand().replace(/&/g, "&amp;").replace(/</g, "&lt;")}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
`;
    fs.mkdirSync(path.dirname(plist), { recursive: true });
    fs.writeFileSync(plist, body, "utf8");
    return { ok: true, path: plist, enabled: true };
  }

  if (process.platform === "linux") {
    const desktop = linuxDesktopPath();
    if (!enabled) {
      try {
        fs.unlinkSync(desktop);
      } catch {
        /* missing ok */
      }
      return { ok: true, path: desktop, enabled: false };
    }
    const body = `[Desktop Entry]
Type=Application
Name=${PRODUCT}
Exec=${launchCommand()}
X-GNOME-Autostart-enabled=true
`;
    fs.mkdirSync(path.dirname(desktop), { recursive: true });
    fs.writeFileSync(desktop, body, "utf8");
    return { ok: true, path: desktop, enabled: true };
  }

  if (process.platform === "win32") {
    const { spawnSync } = require("child_process");
    const key = winRunKey();
    const valueName = PRODUCT;
    if (!enabled) {
      spawnSync("reg", ["delete", key, "/v", valueName, "/f"], { encoding: "utf8" });
      return { ok: true, path: key, enabled: false };
    }
    const cmd = launchCommand();
    const result = spawnSync(
      "reg",
      ["add", key, "/v", valueName, "/t", "REG_SZ", "/d", cmd, "/f"],
      { encoding: "utf8" }
    );
    if (result.status !== 0) {
      return {
        ok: false,
        error: (result.stderr || result.stdout || "reg-failed").trim(),
        enabled: false
      };
    }
    return { ok: true, path: key, enabled: true };
  }

  return { ok: false, error: "unsupported-platform", enabled: false };
}

function setOpenAtLogin(enabled) {
  const applied = applyOpenAtLogin(Boolean(enabled));
  if (!applied.ok) {
    writeSettings({ openAtLogin: false });
    return { settings: readSettings(), applied };
  }
  const settings = writeSettings({ openAtLogin: applied.enabled });
  return { settings, applied };
}

function getOpenAtLogin() {
  return readSettings();
}

module.exports = {
  getOpenAtLogin,
  setOpenAtLogin,
  readSettings,
  writeSettings,
  settingsPath,
  applyOpenAtLogin,
  honestLimitsResolved,
  honestLimitsEnvBypass,
  setHonestLimitsAck,
  setHonestLimitsSkip,
  clearHonestLimits
};