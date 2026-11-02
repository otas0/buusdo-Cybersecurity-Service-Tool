/**
 * Desktop machine-scan smoke on a temp folder — never the real home directory.
 * Covers continue-after-cap, decline, and quarantine restore.
 *
 *   npm run smoke:desktop-machine
 */

import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const root = await mkdtemp(path.join(tmpdir(), "shield-machine-smoke-"));
const data = await mkdtemp(path.join(tmpdir(), "shield-machine-smoke-data-"));
const downloads = path.join(root, "Downloads");
await mkdir(downloads, { recursive: true });
await writeFile(path.join(downloads, "invoice.pdf.exe"), "");
for (let i = 0; i < 6; i += 1) {
  await writeFile(path.join(root, `note-${i}.txt`), "plain\n");
}

const uiPort = 32111;
const proxyPort = 32112;
const child = spawn(process.execPath, ["src/server.js"], {
  cwd: path.resolve("desktop-app"),
  env: {
    ...process.env,
    UI_PORT: String(uiPort),
    PROXY_PORT: String(proxyPort),
    SHIELD_MACHINE_SCAN_ROOT: root,
    SHIELD_MACHINE_SCAN_MAX_FILES: "2",
    SHIELD_HONEST_LIMITS: "0",
    SHIELD_LISTS_PATH: path.join(data, "shield-backup.json"),
    SHIELD_QUARANTINE_PATH: path.join(data, "quarantine"),
    SHIELD_MACHINE_DECISION_PATH: path.join(data, "machine-decision.json")
  },
  stdio: ["ignore", "pipe", "pipe"]
});

function fail(message) {
  child.kill("SIGTERM");
  throw new Error(message);
}

async function getScan() {
  const response = await fetch(`http://localhost:${uiPort}/api/machine-scan`);
  if (!response.ok) fail(`scan HTTP ${response.status}`);
  const body = await response.json();
  return body.scan;
}

try {
  let scan = null;
  for (let i = 0; i < 40; i += 1) {
    try {
      scan = await getScan();
      if (scan?.status === "ready" || scan?.status === "error") break;
    } catch {
      /* server still binding */
    }
    await delay(150);
  }
  if (!scan || scan.status !== "ready") fail(`scan did not finish: ${scan?.status} ${scan?.error || ""}`);
  if (!scan.coverage?.capped) fail("expected the file cap so continue can run");
  if (!scan.coverage?.currentDir) fail("expected the scan to name the directory it is reading");

  const beforeContinue = scan.coverage.files;
  for (let round = 0; round < 8 && scan.coverage?.capped; round += 1) {
    const continued = await fetch(`http://localhost:${uiPort}/api/machine-scan/continue`, { method: "POST" });
    const continueBody = await continued.json();
    if (!continued.ok) fail(`continue failed: ${continueBody.error}`);
    for (let i = 0; i < 40; i += 1) {
      scan = await getScan();
      if (scan.status === "ready" || scan.status === "error") break;
      await delay(100);
    }
  }
  if (scan.coverage.files <= beforeContinue) fail(`continue did not read more files (${scan.coverage.files})`);
  if (scan.coverage.capped) fail("scan stayed capped after continue");

  const dropped = path.join(downloads, "invoice.pdf.exe");
  await access(dropped);
  const declined = await fetch(`http://localhost:${uiPort}/api/machine-scan/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ choice: "decline" })
  });
  const declineBody = await declined.json();
  if (!declined.ok || declineBody.scan?.decision?.choice !== "decline") fail("decline did not stick");
  await access(dropped);

  const blocked = await fetch(`http://localhost:${uiPort}/api/machine-scan/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ choice: "block-maximum" })
  });
  const blockBody = await blocked.json();
  if (!blocked.ok) fail(`block failed: ${blockBody.error}`);
  let missing = false;
  try {
    await access(dropped);
  } catch {
    missing = true;
  }
  if (!missing) fail("disguised file was not quarantined");

  const restored = await fetch(`http://localhost:${uiPort}/api/machine-scan/restore`, { method: "POST" });
  const restoreBody = await restored.json();
  if (!restored.ok || !restoreBody.ok) fail(`restore failed: ${JSON.stringify(restoreBody.result?.errors || restoreBody.error)}`);
  await access(dropped);
  console.log("desktop machine smoke ok");
} finally {
  child.kill("SIGTERM");
  await delay(200);
  await rm(root, { recursive: true, force: true });
  await rm(data, { recursive: true, force: true });
}