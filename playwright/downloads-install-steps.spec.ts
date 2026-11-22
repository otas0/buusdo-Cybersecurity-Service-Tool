/**
 * Downloads page — three-step install list visible (smoke).
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://buusdocst.mtsu.workers.dev \
 *     npx playwright test playwright/downloads-install-steps.spec.ts
 *
 * Local: omit PLAYWRIGHT_SKIP_WEBSERVER so webServer from playwright.config starts.
 */
import { test, expect } from "@playwright/test";

const base = (process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

test.describe("Downloads install steps smoke", () => {
  test("/en/downloads shows three install steps", async ({ page }) => {
    await page.goto(`${base}/en/downloads`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("downloads-page")).toBeVisible();
    const steps = page.getByTestId("downloads-desktop-install-steps");
    await expect(steps).toBeVisible();
    await expect(steps.locator("li")).toHaveCount(3);
    await expect(page.getByTestId("downloads-extension-store-only")).toBeVisible();
  });

  test("/pt-PT/downloads shows three install steps", async ({ page }) => {
    await page.goto(`${base}/pt-PT/downloads`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("downloads-page")).toBeVisible();
    const steps = page.getByTestId("downloads-desktop-install-steps");
    await expect(steps).toBeVisible();
    await expect(steps.locator("li")).toHaveCount(3);
  });
});
