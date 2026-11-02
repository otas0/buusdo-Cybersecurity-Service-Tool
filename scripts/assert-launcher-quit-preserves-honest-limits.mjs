/**
 * Tray/dashboard Quit must not clear honest-limits settings.
 *
 *   node scripts/assert-launcher-quit-preserves-honest-limits.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const launcher = readFileSync(path.join(root, "desktop-app/src/launcher.js"), "utf8");
const server = readFileSync(path.join(root, "desktop-app/src/server.js"), "utf8");
const install = readFileSync(path.join(root, "desktop-app/src/install.js"), "utf8");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (launcher.includes("clearHonestLimits")) {
  fail("launcher.js must not call clearHonestLimits (Quit must leave pending/ack intact)");
}

if (install.includes("clearHonestLimits")) {
  fail("install.js silent path must not call clearHonestLimits");
}
if (!install.includes("setOpenAtLogin")) {
  fail("install.js must use setOpenAtLogin (merge preserves honestLimitsAckAt)");
}
// install.json writer must never stamp honest-limits fields (settings.json owns those).
const markerWrite = install.match(/writeFileSync\(\s*marker[\s\S]*?\);/);
if (!markerWrite) fail("install.js install.json writer not found");
if (/honestLimits/i.test(markerWrite[0])) {
  fail("install.json writer must not set honestLimitsAckAt / honestLimitsSkippedAt");
}

if (!launcher.includes("never clears settings.json honest-limits")) {
  fail("launcher.js Quit path missing honest-limits preserve comment");
}

const stopAll = launcher.match(/async function stopAll\([\s\S]*?^}/m);
if (!stopAll) fail("launcher.js stopAll() not found");
if (stopAll[0].includes("writeSettings") || stopAll[0].includes("clearHonestLimits")) {
  fail("stopAll() must not call writeSettings / clearHonestLimits");
}

const quitHandler = server.match(/app\.post\("\/api\/quit"[\s\S]{0,800}?}\);/);
if (!quitHandler) fail("server.js /api/quit handler not found");
if (
  quitHandler[0].includes("clearHonestLimits") ||
  quitHandler[0].includes("writeSettings") ||
  quitHandler[0].includes("honestLimits")
) {
  fail("/api/quit must not mutate settings.json (writeSettings / honest-limits)");
}

console.log("assert-launcher-quit-preserves-honest-limits ok");