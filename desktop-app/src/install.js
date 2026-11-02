/**
 * Silent install entry — prepares the user data directory and keeps open-at-login off.
 * Does not write LaunchAgents, .desktop autostart files, or HKCU Run keys.
 *
 *   node src/install.js
 *   node src/launcher.js --install
 */

const fs = require("fs");
const path = require("path");
const { ensureDataDir, PRODUCT } = require("./user-data");
const autostart = require("./autostart");

function silentInstall() {
  const dataDir = ensureDataDir();
  const settings = autostart.setOpenAtLogin(false);
  // Belt-and-braces: remove any leftover login item from a previous build.
  autostart.applyOpenAtLogin(false);
  const marker = path.join(dataDir, "install.json");
  fs.writeFileSync(
    marker,
    `${JSON.stringify(
      {
        product: PRODUCT,
        installedAt: new Date().toISOString(),
        openAtLogin: false,
        note: "Silent install never enables open-at-login."
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  return {
    ok: true,
    dataDir,
    settings: settings.settings,
    openAtLogin: false,
    marker
  };
}

if (require.main === module) {
  const result = silentInstall();
  console.log(`[desktop] Silent install ok → ${result.dataDir}`);
  console.log(`[desktop] Open at login → off (no login item written)`);
  process.exit(0);
}

module.exports = { silentInstall };