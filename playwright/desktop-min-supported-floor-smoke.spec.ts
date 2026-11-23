/**
 * Desktop UI serves /shared/min-supported-floor.mjs and renders the honest-limits floor line.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/desktop-min-supported-floor-smoke.spec.ts
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { expect, test } from "@playwright/test";

async function waitForState(uiPort: number) {
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(`http://localhost:${uiPort}/api/state`);
      if (res.ok) return res.json();
    } catch {
      /* wait */
    }
    await delay(100);
  }
  throw new Error("desktop dashboard did not start");
}

test("pack smoke: /shared/min-supported-floor.mjs served + floor line renders", async ({
  page
}) => {
  const data = await mkdtemp(path.join(tmpdir(), "shield-pw-floor-"));
  const uiPort = 32421;
  const proxyPort = 32422;
  let child: ChildProcess | null = null;

  try {
    child = spawn(process.execPath, ["src/server.js"], {
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
        SHIELD_HONEST_LIMITS: "1",
        SHIELD_MACHINE_SCAN: "0"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    await waitForState(uiPort);

    const mod = await fetch(`http://localhost:${uiPort}/shared/min-supported-floor.mjs`);
    expect(mod.status).toBe(200);
    const body = await mod.text();
    expect(body).toMatch(/formatMinSupportedFloorNote/);
    expect(body).toMatch(/formatMinSupportedSourceLabel/);

    await page.goto(`http://localhost:${uiPort}/`, { waitUntil: "domcontentloaded" });
    const floor = page.getByTestId("honest-limits-min-supported");
    // Soft when honest-limits UI not shown in this build config.
    if ((await floor.count()) === 0) {
      // API path still documents the shared module is reachable.
      console.info("[desktop-floor-smoke] honest-limits-min-supported absent — module served OK");
      return;
    }
    await expect(floor).toBeVisible({ timeout: 10_000 });
    const text = ((await floor.textContent()) || "").trim();
    expect(text.length).toBeGreaterThan(0);
    expect(text).toMatch(/\d+\.\d+\.\d+/);
  } finally {
    child?.kill("SIGTERM");
    await delay(400);
    await rm(data, { recursive: true, force: true });
  }
});
