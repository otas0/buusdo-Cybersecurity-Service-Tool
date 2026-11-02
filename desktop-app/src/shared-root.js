/**
 * shared/ lives next to desktop-app in the repo, and in Resources/shared
 * when the Electron package is installed.
 */

const fs = require("fs");
const path = require("path");

function sharedRoot() {
  const candidates = [
    process.env.SHIELD_SHARED_ROOT ? path.resolve(process.env.SHIELD_SHARED_ROOT) : "",
    path.resolve(__dirname, "..", "..", "shared"),
    path.resolve(__dirname, "..", "shared"),
    process.resourcesPath ? path.join(process.resourcesPath, "shared") : ""
  ].filter(Boolean);
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "detect.mjs"))) return dir;
  }
  return candidates[0];
}

module.exports = { sharedRoot };