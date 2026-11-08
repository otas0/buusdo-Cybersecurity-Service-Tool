/**
 * Desktop lang select → sv shows non-EN honestLimitsTitle on the gate.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/desktop-sv-honest-limits.spec.ts
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const svTitle = (
  JSON.parse(readFileSync("i18n/packs/sv.json", "utf8")) as { honestLimitsTitle: string }
).honestLimitsTitle;
const enTitle = "Before this computer is scanned";

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

test("choosing sv shows non-EN honestLimitsTitle", async ({ page }) => {
  const data = await mkdtemp(path.join(tmpdir(), "shield-pw-sv-data-"));
  const fixture = await mkdtemp(path.join(tmpdir(), "shield-pw-sv-fixture-"));
  const uiPort = 32211;
  const proxyPort = 32212;
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
    await page.getByTestId("desktop-locale-select").selectOption("sv");
    await expect(page.locator("#honestLimitsTitle")).toHaveText(svTitle);
    await expect(page.locator("#honestLimitsTitle")).not.toHaveText(enTitle);
  } finally {
    child?.kill("SIGTERM");
    await delay(400);
    await rm(data, { recursive: true, force: true });
    await rm(fixture, { recursive: true, force: true });
  }
});
