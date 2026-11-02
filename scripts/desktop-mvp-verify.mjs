/**
 * MVP gate — one command for the desktop core loop.
 * Temp dirs / fixtures only (no real-home quarantine).
 *
 *   npm run mvp
 */

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(".");
process.env.SHIELD_QUIT_GRACE_MS = process.env.SHIELD_QUIT_GRACE_MS || "0";

const ACK_SMOKE = "smoke:desktop-honest-limits-ack";
const FIRST_OPEN_SMOKE = "smoke:desktop-first-open";

const steps = [
  {
    name: "unit: desktop machine / lists / focus / state",
    cmd: "npx",
    args: [
      "tsx",
      "--test",
      "tests/desktop-machine-scan.test.ts",
      "tests/desktop-user-data-autostart.test.ts",
      "tests/desktop-honest-limits-diagnostics.test.ts",
      "tests/desktop-reveal-path.test.ts",
      "tests/desktop-machine-focus.test.ts",
      "tests/desktop-state-user-block-cap.test.ts",
      "tests/desktop-lists-classify.test.ts"
    ]
  },
  { name: "smoke: honest-limits ack → scan ≠ idle", cmd: "npm", args: ["run", ACK_SMOKE] },
  { name: "smoke: first-open DOM polish", cmd: "npm", args: ["run", FIRST_OPEN_SMOKE] },
  { name: "smoke: machine continue/decline/restore", cmd: "npm", args: ["run", "smoke:desktop-machine"] },
  { name: "smoke: launcher single-instance + quit", cmd: "npm", args: ["run", "smoke:desktop-launcher"] },
  { name: "smoke: install-accept", cmd: "npm", args: ["run", "smoke:desktop-install-accept"] },
  { name: "smoke: proxy readout ≠ Halt", cmd: "npm", args: ["run", "smoke:desktop-proxy-readout"] },
  { name: "smoke: quarantine i18n EN/pt-PT", cmd: "npm", args: ["run", "smoke:desktop-quarantine-i18n"] },
  { name: "smoke: ui mvp polish", cmd: "npm", args: ["run", "smoke:desktop-ui-mvp"] }
];

// Self-check: ack + first-open smokes must stay wired (package.json + this step list).
{
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  for (const script of [ACK_SMOKE, FIRST_OPEN_SMOKE]) {
    if (!pkg.scripts?.[script]) {
      console.error(`FAIL: package.json missing scripts["${script}"]`);
      process.exit(1);
    }
    const wired = steps.some((s) => Array.isArray(s.args) && s.args.includes(script));
    if (!wired) {
      console.error(`FAIL: desktop-mvp-verify steps missing npm run ${script}`);
      process.exit(1);
    }
  }
  const settingsContract = readFileSync(
    path.join(root, "docs/DESKTOP_SETTINGS_CONTRACT.md"),
    "utf8"
  );
  if (!settingsContract.includes("honestLimitsAckAt")) {
    console.error("FAIL: docs/DESKTOP_SETTINGS_CONTRACT.md must document honestLimitsAckAt");
    process.exit(1);
  }
  const serverSrc = readFileSync(path.join(root, "desktop-app/src/server.js"), "utf8");
  if (!serverSrc.includes('require("./reveal-path")') && !serverSrc.includes("require('./reveal-path')")) {
    console.error("FAIL: desktop-app/src/server.js must require ./reveal-path");
    process.exit(1);
  }
  if (!serverSrc.includes('Cache-Control') || !serverSrc.includes("no-store")) {
    console.error("FAIL: desktop-app/src/server.js must set Cache-Control: no-store on static CSS/JS/HTML");
    process.exit(1);
  }
  if (!serverSrc.includes("injectAssetVersion") || !serverSrc.includes("assetVersion")) {
    console.error("FAIL: desktop-app/src/server.js must inject asset ?v= from package.json");
    process.exit(1);
  }
}

let failed = 0;
for (const step of steps) {
  console.log(`\n== MVP: ${step.name} ==`);
  const result = spawnSync(step.cmd, step.args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  if (result.status !== 0) {
    console.error(`FAIL: ${step.name} (exit ${result.status})`);
    failed += 1;
    break;
  }
  console.log(`OK: ${step.name}`);
}

if (failed) {
  process.exit(1);
}
console.log("\ndesktop MVP verify ok");
