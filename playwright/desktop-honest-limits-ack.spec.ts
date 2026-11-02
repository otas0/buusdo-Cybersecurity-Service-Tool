/**
 * Desktop honest-limits gate: click #honestLimitsAck → #machineStatus leaves waiting copy.
 * Spawns a temp-fixture desktop server (never the real home). Skip website webServer.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/desktop-honest-limits-ack.spec.ts
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { expect, test } from "@playwright/test";

const WAITING_EN = "Confirm honest limits before the first scan (or skip).";
const WAITING_PT = "Confirme os limites honestos antes da primeira análise (ou salte).";

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

test("ack leaves #machineStatus waiting copy", async ({ page }) => {
  const data = await mkdtemp(path.join(tmpdir(), "shield-pw-honest-data-"));
  const fixture = await mkdtemp(path.join(tmpdir(), "shield-pw-honest-fix-"));
  const uiPort = 32201;
  const proxyPort = 32202;
  await mkdir(path.join(fixture, "Downloads"), { recursive: true });
  await writeFile(path.join(fixture, "Downloads", "note.txt"), "ok\n");

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
        SHIELD_MACHINE_SCAN_ROOT: fixture,
        SHIELD_MACHINE_SCAN_SYSTEM: "0",
        SHIELD_QUIT_GRACE_MS: "0"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    const state = await waitForState(uiPort);
    expect(state.honestLimitsPending).toBe(true);

    await page.goto(`http://localhost:${uiPort}/`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("honest-limits-gate")).toBeVisible();
    const status = page.locator("#machineStatus");
    await expect(status).toBeVisible();
    const before = (await status.innerText()).trim();
    expect(before === WAITING_EN || before === WAITING_PT).toBeTruthy();

    await page.getByTestId("honest-limits-ack").click();
    await expect(page.getByTestId("honest-limits-gate")).toBeHidden({ timeout: 10_000 });
    await expect(status).not.toHaveText(WAITING_EN, { timeout: 10_000 });
    await expect(status).not.toHaveText(WAITING_PT);
  } finally {
    child?.kill("SIGTERM");
    await delay(400);
    await rm(data, { recursive: true, force: true });
    await rm(fixture, { recursive: true, force: true });
  }
});