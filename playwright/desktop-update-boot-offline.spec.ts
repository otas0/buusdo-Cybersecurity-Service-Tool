/**
 * Boot-path offline update check (own ports — do not share with force/optional gates).
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/desktop-update-boot-offline.spec.ts
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

test("boot update-check offline sets data-status=offline (not fail)", async ({ page }) => {
  const data = await mkdtemp(path.join(tmpdir(), "shield-pw-boot-offline-"));
  const uiPort = 32411;
  const proxyPort = 32412;
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
        SHIELD_HONEST_LIMITS: "0",
        SHIELD_MACHINE_SCAN: "0"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    await waitForState(uiPort);

    await page.route("**/api/update-check", async (route) => {
      await route.abort("failed");
    });

    await page.goto(`http://localhost:${uiPort}/`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("update-check-offline")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("update-check-offline")).toHaveAttribute("data-status", "offline");
    await expect(page.getByTestId("update-check-offline")).toHaveAttribute("role", "status");
    await expect(page.getByTestId("update-check-offline")).toHaveAttribute("aria-live", "polite");
    await expect(page.getByTestId("update-check-fail")).toHaveCount(0);
  } finally {
    child?.kill("SIGTERM");
    await delay(400);
    await rm(data, { recursive: true, force: true });
  }
});
