/**
 * Real SettingsPanel on the website — route-stub /api/desktop-downloads/status → ready-to-promote.
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test playwright/settings-mac-ready-to-promote-live.spec.ts
 *
 * Without PLAYWRIGHT_BASE_URL → skip (offline stub: settings-mac-ready-to-promote.spec.ts).
 */
import { expect, test } from "@playwright/test";
import desktopDownloads from "../shared/desktop-downloads.json" with { type: "json" };

const base = (process.env.PLAYWRIGHT_BASE_URL || "").trim().replace(/\/$/, "");

async function baseReachable(): Promise<boolean> {
  if (!base) return false;
  try {
    const res = await fetch(base, { signal: AbortSignal.timeout(4000) });
    return res.status > 0;
  } catch {
    return false;
  }
}

test("live SettingsPanel: ready-to-promote note from status API", async ({ page }) => {
  if (!base) {
    test.skip(
      true,
      "set PLAYWRIGHT_BASE_URL for live Settings (offline: settings-mac-ready-to-promote.spec.ts)"
    );
    return;
  }
  if (!(await baseReachable())) {
    test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
    return;
  }

  const primary = String(desktopDownloads.macosAppZipUrl || "").trim();
  const notarized = String(desktopDownloads.macosAppZipUrlNotarized || "").trim();
  const unsigned = String(desktopDownloads.macosAppZipUrlUnsigned || primary).trim();

  await page.route("**/api/desktop-downloads/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        macNote: "ready-to-promote",
        notarizedHeadOk: true,
        notarizedHeadStatus: 200,
        notPromoted: true,
        primaryIsNotarized: false,
        // Keep URLs coherent for any client-side checks
        primary,
        notarized,
        unsigned
      })
    });
  });

  await page.goto(`${base}/en/settings#settings-desktop`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("settings-desktop-downloads")).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("settings-desktop-mac-ready-to-promote")).toBeVisible({
    timeout: 15000
  });
  await expect(page.getByTestId("settings-desktop-mac-ready-to-promote")).toContainText(
    /desktop-promote-macos-url|HEAD 200/i
  );
});