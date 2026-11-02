/**
 * Windows Startup / HKCU Run / schtasks path sampling for planSystemTargets.
 * On non-Windows CI this runs the same fixtures and exits 0.
 * On Windows it also probes the live Startup folder (read-only).
 *
 *   npm run sample:desktop-windows-startup
 */

import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { planSystemTargets, mayQuarantinePath } = require("../desktop-app/src/machine-paths.js");

const home = process.platform === "win32" ? os.homedir() : "C:\\Users\\Sample";
const text = [
  `Task To Run: ${home}\\Downloads\\invoice.pdf.exe`,
  `${home}\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\payload.bat`,
  `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run → ${home}\\AppData\\Local\\Temp\\drop.exe`,
  "schtasks → C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
  "C:\\Windows\\System32\\cmd.exe"
].join("\n");

const planned = planSystemTargets(text, { platform: "win32", homeDir: home });
const byPath = Object.fromEntries(planned.map((item) => [item.path.toLowerCase(), item.action]));

assert.equal(byPath[`${home}\\downloads\\invoice.pdf.exe`.toLowerCase()], "quarantine");
assert.equal(byPath[`${home}\\appdata\\local\\temp\\drop.exe`.toLowerCase()], "quarantine");
assert.equal(byPath["c:\\windows\\system32\\cmd.exe"], "report-only");
assert.equal(mayQuarantinePath("C:\\Windows\\System32\\cmd.exe", home, "win32"), false);

if (process.platform === "win32") {
  const startup = path.join(
    process.env.APPDATA || path.join(home, "AppData", "Roaming"),
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    "Startup"
  );
  console.log(`live Startup folder: ${startup} exists=${existsSync(startup)}`);
  if (existsSync(startup)) {
    const names = readdirSync(startup).slice(0, 20);
    for (const name of names) {
      const full = path.join(startup, name);
      const action = mayQuarantinePath(full, home, "win32") ? "quarantine" : "report-only";
      console.log(`  sample ${name} → ${action}`);
    }
  }
}

console.log(`windows startup sample ok (${planned.length} planned paths)`);