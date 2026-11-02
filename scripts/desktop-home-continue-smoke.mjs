/**
 * Read-only smoke on the real home directory: currentDir timeline + continue.
 * NEVER calls block / quarantine / decide — do not use this against a developer
 * machine as a block test. Uses a temp data dir and high ports.
 * Timeline → desktop-app/dist/smoke-currentDir-timeline.json (gitignored).
 *
 *   npm run smoke:desktop-home-continue
 */

import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const data = await mkdtemp(path.join(os.tmpdir(), "shield-home-continue-"));
const uiPort = 32131;
const proxyPort = 32132;
const home = os.homedir();
const timelinePath = path.resolve("desktop-app/dist/smoke-currentDir-timeline.json");
const timeline = [];
console.log("home continue smoke: READ-ONLY — will not POST decide/block/quarantine");

const child = spawn(process.execPath, ["src/server.js"], {
  cwd: path.resolve("desktop-app"),
  env: {
    ...process.env,
    UI_PORT: String(uiPort),
    PROXY_PORT: String(proxyPort),
    SHIELD_DATA_DIR: data,
    SHIELD_LISTS_PATH: path.join(data, "shield-backup.json"),
    SHIELD_QUARANTINE_PATH: path.join(data, "quarantine"),
    SHIELD_MACHINE_DECISION_PATH: path.join(data, "machine-decision.json"),
    SHIELD_MACHINE_SCAN_MAX_FILES: "40",
    SHIELD_MACHINE_SCAN_SYSTEM: "0",
    SHIELD_HONEST_LIMITS: "0",
    SHIELD_QUIT_GRACE_MS: process.env.SHIELD_QUIT_GRACE_MS || "0"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

const t0 = Date.now();

function sample(scan) {
  timeline.push({
    ms: Date.now() - t0,
    status: scan?.status || null,
    files: scan?.coverage?.files ?? null,
    currentDir: scan?.coverage?.currentDir || null,
    capped: scan?.coverage?.capped ?? null
  });
}

function fail(message) {
  child.kill("SIGTERM");
  throw new Error(message);
}

async function getScan() {
  const res = await fetch(`http://localhost:${uiPort}/api/machine-scan`);
  if (!res.ok) fail(`scan HTTP ${res.status}`);
  return (await res.json()).scan;
}

try {
  let sawDir = false;
  let scan = null;
  for (let i = 0; i < 120; i += 1) {
    try {
      scan = await getScan();
      sample(scan);
      if (scan?.coverage?.currentDir) sawDir = true;
      if (scan?.status === "ready" || scan?.status === "error") break;
    } catch {
      /* binding */
    }
    await delay(200);
  }
  if (!scan || scan.status === "error") fail(`scan failed: ${scan?.error || "no-scan"}`);
  if (!sawDir && !scan.coverage?.currentDir) fail("expected coverage.currentDir while walking the home directory");
  if (!scan.coverage?.currentDir) fail("missing currentDir after ready");

  if (scan.coverage?.capped) {
    const before = scan.coverage.files;
    const cont = await fetch(`http://localhost:${uiPort}/api/machine-scan/continue`, { method: "POST" });
    const body = await cont.json();
    if (!cont.ok) fail(`continue failed: ${body.error}`);
    for (let i = 0; i < 120; i += 1) {
      scan = await getScan();
      sample(scan);
      if (scan.status === "ready" || scan.status === "error") break;
      await delay(200);
    }
    if (scan.coverage.files <= before) fail(`continue did not advance files (${before} → ${scan.coverage.files})`);
  }

  await mkdir(path.dirname(timelinePath), { recursive: true });
  await writeFile(timelinePath, `${JSON.stringify({ home, timeline }, null, 2)}\n`, "utf8");
  console.log(`currentDir timeline → ${timelinePath} (${timeline.length} samples)`);
  console.log("home continue smoke ok");
} finally {
  child.kill("SIGTERM");
  await delay(300);
  await rm(data, { recursive: true, force: true });
}