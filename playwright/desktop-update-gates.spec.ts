/**
 * Desktop force / optional update gates with mocked /api/update-check.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/desktop-update-gates.spec.ts
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

test("force gate + after-download emphasize; optional banner dismiss", async ({ page }) => {
  const data = await mkdtemp(path.join(tmpdir(), "shield-pw-update-"));
  const uiPort = 32211;
  const proxyPort = 32212;
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
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          version: "0.1.0",
          releaseTag: "desktop-v0.9.0",
          remoteVersion: "0.9.0",
          minSupportedVersion: "0.9.0",
          forceUpdate: true,
          updateAvailable: true,
          downloadUrl: "https://example.test/desktop.zip",
          setupGuideUrl: "https://example.test/setup",
          preferNotarized: false,
          notarizedHeadOk: false,
          notarizedHeadStatus: 404
        })
      });
    });

    await page.goto(`http://localhost:${uiPort}/`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("update-check").click();
    await expect(page.getByTestId("force-update-gate")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("force-update-after-download")).toBeVisible();
    await expect(page.getByTestId("force-update-download")).toHaveClass(/halt-button/);

    // Click without following the external href.
    await page.getByTestId("force-update-download").evaluate((el: HTMLAnchorElement) => {
      el.addEventListener("click", (e) => e.preventDefault(), { once: true });
      el.click();
    });
    await expect(page.getByTestId("force-update-after-download")).toHaveClass(/is-emphasized/);
    await expect(page.getByTestId("force-update-after-download")).toHaveAttribute(
      "aria-live",
      "assertive"
    );

    // Optional (non-force) path
    await page.unroute("**/api/update-check");
    await page.route("**/api/update-check", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          version: "0.2.0",
          releaseTag: "desktop-v0.2.1",
          remoteVersion: "0.2.1",
          minSupportedVersion: "0.2.0",
          forceUpdate: false,
          updateAvailable: true,
          downloadUrl: "https://example.test/desktop-opt.zip",
          setupGuideUrl: "https://example.test/setup",
          preferNotarized: false,
          notarizedHeadOk: false,
          notarizedHeadStatus: 404
        })
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    // Boot auto-check uses mocked optional update
    await expect(page.getByTestId("optional-update-banner")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("optional-update-dismiss").click();
    await expect(page.getByTestId("optional-update-banner")).toBeHidden();
    await expect(page.getByTestId("optional-update-show-hint")).toBeVisible();

    // Same tag: manual check keeps banner hidden (dismiss persists).
    await page.getByTestId("update-check").click();
    await expect(page.getByTestId("optional-update-banner")).toBeHidden();
    await expect(page.getByTestId("optional-update-show-hint")).toBeVisible();

    const settings = await fetch(`http://localhost:${uiPort}/api/settings`).then((r) => r.json());
    expect(settings.settings?.optionalUpdateDismissedTag).toBe("desktop-v0.2.1");

    // New releaseTag clears dismiss — banner returns (E2E clear path).
    await page.unroute("**/api/update-check");
    await page.route("**/api/update-check", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          version: "0.2.0",
          releaseTag: "desktop-v0.2.2",
          remoteVersion: "0.2.2",
          minSupportedVersion: "0.2.0",
          forceUpdate: false,
          updateAvailable: true,
          downloadUrl: "https://example.test/desktop-opt-v022.zip",
          setupGuideUrl: "https://example.test/setup",
          preferNotarized: false,
          notarizedHeadOk: false,
          notarizedHeadStatus: 404
        })
      });
    });
    await page.getByTestId("update-check").click();
    await expect(page.getByTestId("optional-update-banner")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("optional-update-show-hint")).toBeHidden();

    const cleared = await fetch(`http://localhost:${uiPort}/api/settings`).then((r) => r.json());
    expect(cleared.settings?.optionalUpdateDismissedTag || "").toBe("");

    // Cross-origin force download must not set download= (same-origin only).
    await page.unroute("**/api/update-check");
    await page.route("**/api/update-check", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          version: "0.1.0",
          releaseTag: "desktop-v0.9.0",
          remoteVersion: "0.9.0",
          minSupportedVersion: "0.9.0",
          forceUpdate: true,
          updateAvailable: true,
          downloadUrl: "https://example.test/cross-origin.zip",
          setupGuideUrl: "https://example.test/setup",
          preferNotarized: false,
          notarizedHeadOk: false,
          notarizedHeadStatus: 404
        })
      });
    });
    await page.getByTestId("update-check").click();
    await expect(page.getByTestId("force-update-gate")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("force-update-download")).not.toHaveAttribute("download", /.+/);

    // Same-origin package URL may set download=.
    await page.unroute("**/api/update-check");
    await page.route("**/api/update-check", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          version: "0.1.0",
          releaseTag: "desktop-v0.9.0",
          remoteVersion: "0.9.0",
          minSupportedVersion: "0.9.0",
          forceUpdate: true,
          updateAvailable: true,
          downloadUrl: `http://localhost:${uiPort}/pack/buusdo-desktop-update.zip`,
          setupGuideUrl: "https://example.test/setup",
          preferNotarized: false,
          notarizedHeadOk: false,
          notarizedHeadStatus: 404
        })
      });
    });
    await page.getByTestId("update-check").click();
    await expect(page.getByTestId("force-update-download")).toHaveAttribute(
      "download",
      "buusdo-desktop-update.zip"
    );
    await expect(page.getByTestId("update-check")).toHaveAttribute("aria-hidden", "true");

    // Leaving force gate restores focus to update-check.
    await page.unroute("**/api/update-check");
    await page.route("**/api/update-check", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          version: "0.2.0",
          releaseTag: "desktop-v0.2.0",
          remoteVersion: "0.2.0",
          minSupportedVersion: "0.2.0",
          forceUpdate: false,
          updateAvailable: false,
          downloadUrl: null,
          setupGuideUrl: "https://example.test/setup",
          preferNotarized: false,
          notarizedHeadOk: false,
          notarizedHeadStatus: 404
        })
      });
    });
    await page.getByTestId("update-check").evaluate((el: HTMLButtonElement) => {
      // Click even while aria-hidden (force still up) via evaluate — then gate closes.
      el.removeAttribute("aria-hidden");
      el.removeAttribute("tabindex");
      el.click();
    });
    await expect(page.getByTestId("force-update-gate")).toBeHidden({ timeout: 10_000 });
    await expect(page.getByTestId("update-check")).not.toHaveAttribute("aria-hidden", "true");
    await expect(page.getByTestId("update-check")).toBeFocused();
  } finally {
    child?.kill("SIGTERM");
    await delay(400);
    await rm(data, { recursive: true, force: true });
  }
});

test("update-check offline and fail data-testids are mutually exclusive", async ({ page }) => {
  const data = await mkdtemp(path.join(tmpdir(), "shield-pw-offline-fail-"));
  const uiPort = 32231;
  const proxyPort = 32232;
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

    // Fail path: API returns ok:false
    await page.route("**/api/update-check", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "mocked-fail" })
      });
    });
    await page.goto(`http://localhost:${uiPort}/`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("update-check").click();
    await expect(page.getByTestId("update-check-fail")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("update-check-fail")).toHaveAttribute("aria-live", "assertive");
    await expect(page.getByTestId("update-check-offline")).toHaveCount(0);

    // Offline path: network abort — must not keep fail testid
    await page.unroute("**/api/update-check");
    await page.route("**/api/update-check", async (route) => {
      await route.abort("failed");
    });
    await page.getByTestId("update-check").click();
    await expect(page.getByTestId("update-check-fail")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("update-check-fail")).toHaveAttribute("aria-live", "assertive");
    await expect(page.getByTestId("update-check-offline")).toHaveCount(0);

    // Boot-style offline: reload with abort so catch sets offline (fromBoot)
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("update-check-offline")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("update-check-offline")).toHaveAttribute("aria-live", "polite");
    await expect(page.getByTestId("update-check-fail")).toHaveCount(0);
  } finally {
    child?.kill("SIGTERM");
    await delay(400);
    await rm(data, { recursive: true, force: true });
  }
});

test("Show update tip restores optional banner after dismiss", async ({ page }) => {
  const data = await mkdtemp(path.join(tmpdir(), "shield-pw-show-hint-"));
  const uiPort = 32221;
  const proxyPort = 32222;
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
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          version: "0.2.0",
          releaseTag: "desktop-v0.2.5",
          remoteVersion: "0.2.5",
          minSupportedVersion: "0.2.0",
          forceUpdate: false,
          updateAvailable: true,
          downloadUrl: "https://example.test/desktop-opt.zip",
          setupGuideUrl: "https://example.test/setup",
          preferNotarized: false,
          notarizedHeadOk: false,
          notarizedHeadStatus: 404
        })
      });
    });

    await page.goto(`http://localhost:${uiPort}/`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("optional-update-banner")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("optional-update-dismiss").click();
    await expect(page.getByTestId("optional-update-banner")).toBeHidden();
    await expect(page.getByTestId("optional-update-show-hint")).toBeVisible();

    await page.getByTestId("optional-update-show-hint").click();
    await expect(page.getByTestId("optional-update-banner")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("optional-update-show-hint")).toBeHidden();

    const settings = await fetch(`http://localhost:${uiPort}/api/settings`).then((r) => r.json());
    expect(settings.settings?.optionalUpdateDismissedTag || "").toBe("");
  } finally {
    child?.kill("SIGTERM");
    await delay(400);
    await rm(data, { recursive: true, force: true });
  }
});
