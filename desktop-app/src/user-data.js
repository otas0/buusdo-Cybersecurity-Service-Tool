/**
 * Writable product data under the signed-in user's home — never the app bundle
 * and never Electron app.getPath("userData").
 *
 *   macOS:  ~/Library/Application Support/Preventive Shield
 *   Windows: %APPDATA%\\Preventive Shield
 *   Linux:  ~/.config/preventive-shield
 *
 * Override the whole directory with SHIELD_DATA_DIR.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const PRODUCT = "Preventive Shield";
const PRODUCT_SLUG = "preventive-shield";

function defaultDataDir() {
  if (process.env.SHIELD_DATA_DIR) {
    return path.resolve(process.env.SHIELD_DATA_DIR);
  }
  const home = os.homedir();
  if (process.platform === "darwin") {
    return path.join(home, "Library", "Application Support", PRODUCT);
  }
  if (process.platform === "win32") {
    const appdata = process.env.APPDATA || path.join(home, "AppData", "Roaming");
    return path.join(appdata, PRODUCT);
  }
  const xdg = process.env.XDG_CONFIG_HOME || path.join(home, ".config");
  return path.join(xdg, PRODUCT_SLUG);
}

function ensureDataDir() {
  const dir = defaultDataDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

module.exports = {
  defaultDataDir,
  ensureDataDir,
  PRODUCT,
  PRODUCT_SLUG
};