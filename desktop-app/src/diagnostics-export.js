/**
 * One-click diagnostics snapshot under the user data directory.
 * Never includes checked addresses, full URLs, or list domain names.
 *
 *   POST /api/diagnostics/export
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { ensureDataDir, PRODUCT } = require("./user-data");

function safeStat(filePath) {
  try {
    const st = fs.statSync(filePath);
    return {
      exists: true,
      size: st.size,
      mtimeMs: st.mtimeMs
    };
  } catch {
    return { exists: false };
  }
}

/**
 * @param {{
 *   settings?: Record<string, unknown>,
 *   ports?: { ui?: number, proxy?: number },
 *   machineStatus?: string,
 *   listsCounts?: { blocked?: number, trusted?: number },
 *   quarantineCount?: number,
 *   privacyMode?: string,
 *   trayAvailable?: boolean,
 *   quitGraceMs?: number
 * }} extras
 */
function buildDiagnosticsPayload(extras = {}) {
  const dataDir = ensureDataDir();
  const files = {
    settings: safeStat(path.join(dataDir, "settings.json")),
    install: safeStat(path.join(dataDir, "install.json")),
    lists: safeStat(path.join(dataDir, "shield-backup.json")),
    machineDecision: safeStat(path.join(dataDir, "machine-decision.json")),
    instanceLock: safeStat(path.join(dataDir, "instance.lock")),
    quarantineDir: safeStat(path.join(dataDir, "quarantine"))
  };

  return {
    schema: "shield-diagnostics-v1",
    product: PRODUCT,
    exportedAt: new Date().toISOString(),
    platform: {
      os: process.platform,
      arch: process.arch,
      node: process.version,
      release: os.release()
    },
    dataDirName: path.basename(dataDir),
    // Path shape only — no home expansion of other users' files; basename keeps support useful.
    dataDirPresent: true,
    files,
    settings: {
      openAtLogin: extras.settings?.openAtLogin === true,
      honestLimitsAckAt: extras.settings?.honestLimitsAckAt || null,
      honestLimitsSkippedAt: extras.settings?.honestLimitsSkippedAt || null
    },
    ports: extras.ports || {},
    machineStatus: extras.machineStatus || "unknown",
    listsCounts: {
      blocked: Number(extras.listsCounts?.blocked) || 0,
      trusted: Number(extras.listsCounts?.trusted) || 0
    },
    quarantineCount: Number(extras.quarantineCount) || 0,
    privacyMode: extras.privacyMode || "off",
    trayAvailable: Boolean(extras.trayAvailable),
    quitGraceMs: Number(extras.quitGraceMs) || 0,
    note: "No checked addresses, no full URLs, no list hostnames."
  };
}

/**
 * Write diagnostics JSON under the data dir; return absolute path + payload.
 * @param {Parameters<typeof buildDiagnosticsPayload>[0]} extras
 */
function writeDiagnosticsExport(extras = {}) {
  const dataDir = ensureDataDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const fileName = `diagnostics-${stamp}.json`;
  const filePath = path.join(dataDir, fileName);
  const payload = buildDiagnosticsPayload(extras);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { ok: true, path: filePath, fileName, payload };
}

module.exports = {
  buildDiagnosticsPayload,
  writeDiagnosticsExport
};