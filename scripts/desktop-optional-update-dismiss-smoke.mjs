/**
 * PUT /api/settings { optionalUpdateDismissedTag } persists and clears.
 *
 *   npm run smoke:desktop-optional-update-dismiss
 */

import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const data = await mkdtemp(path.join(tmpdir(), "shield-opt-dismiss-"));
const uiPort = 32181;
const proxyPort = 32182;

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
    SHIELD_QUIT_GRACE_MS: "0",
    SHIELD_HONEST_LIMITS: "0",
    SHIELD_MACHINE_SCAN: "0"
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

  const tag = "desktop-v9.9.9";
  const put = await fetch(`http://localhost:${uiPort}/api/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionalUpdateDismissedTag: tag })
  });
  const putBody = await put.json();
  if (!put.ok || !putBody?.ok) fail(`dismiss PUT failed: ${putBody?.error || put.status}`);
  if (putBody.settings?.optionalUpdateDismissedTag !== tag) {
    fail(`expected dismissed tag ${tag}, got ${putBody.settings?.optionalUpdateDismissedTag}`);
  }

  const get = await fetch(`http://localhost:${uiPort}/api/settings`).then((r) => r.json());
  if (get.settings?.optionalUpdateDismissedTag !== tag) {
    fail("GET /api/settings did not echo optionalUpdateDismissedTag");
  }

  const clear = await fetch(`http://localhost:${uiPort}/api/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionalUpdateDismissedTag: "" })
  }).then((r) => r.json());
  if (clear.settings?.optionalUpdateDismissedTag) {
    fail("clear dismiss should null optionalUpdateDismissedTag");
  }

  console.log("desktop optional-update dismiss smoke ok");
} finally {
  child.kill("SIGTERM");
  await delay(400);
  await rm(data, { recursive: true, force: true });
}
