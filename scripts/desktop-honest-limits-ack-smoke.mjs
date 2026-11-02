/**
 * Honest-limits ack must leave /api/machine-scan status ≠ idle.
 * Temp fixture only — never scans the real home.
 *
 *   npm run smoke:desktop-honest-limits-ack
 */

import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const data = await mkdtemp(path.join(tmpdir(), "shield-honest-ack-data-"));
const fixture = await mkdtemp(path.join(tmpdir(), "shield-honest-ack-fix-"));
const uiPort = 32171;
const proxyPort = 32172;

await mkdir(path.join(fixture, "Downloads"), { recursive: true });
await writeFile(path.join(fixture, "Downloads", "note.txt"), "ok\n");

function fail(message) {
  throw new Error(message);
}

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
    SHIELD_MACHINE_SCAN_ROOT: fixture,
    SHIELD_MACHINE_SCAN_SYSTEM: "0",
    SHIELD_QUIT_GRACE_MS: "0"
    // SHIELD_HONEST_LIMITS intentionally unset — gate must block auto-scan
  },
  stdio: ["ignore", "pipe", "pipe"]
});

try {
  for (let i = 0; i < 50; i += 1) {
    try {
      if ((await fetch(`http://localhost:${uiPort}/api/state`)).ok) break;
    } catch {
      /* wait */
    }
    await delay(100);
  }

  const before = await fetch(`http://localhost:${uiPort}/api/state`).then((r) => r.json());
  if (!before.honestLimitsPending) fail("expected honestLimitsPending before ack");
  const idleScan = await fetch(`http://localhost:${uiPort}/api/machine-scan`).then((r) => r.json());
  if (idleScan?.scan?.status !== "idle") {
    fail(`expected idle before ack, got ${idleScan?.scan?.status}`);
  }

  const ack = await fetch(`http://localhost:${uiPort}/api/honest-limits/ack`, { method: "POST" });
  const ackBody = await ack.json();
  if (!ack.ok || !ackBody?.ok) fail(`ack failed: ${ackBody?.error || ack.status}`);

  let status = ackBody.scan?.status || "idle";
  for (let i = 0; i < 40 && status === "idle"; i += 1) {
    await delay(100);
    const view = await fetch(`http://localhost:${uiPort}/api/machine-scan`).then((r) => r.json());
    status = view?.scan?.status || "idle";
  }
  if (status === "idle") fail("after ack, machine-scan stayed idle");

  console.log(`desktop honest-limits ack smoke ok (status=${status})`);
} finally {
  child.kill("SIGTERM");
  await delay(400);
  await rm(data, { recursive: true, force: true });
  await rm(fixture, { recursive: true, force: true });
}