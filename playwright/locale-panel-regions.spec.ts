/**
 * Language panel: search + region accordion (no Frequent strip).
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/locale-panel-regions.spec.ts
 */
import { test, expect } from "@playwright/test";
import { waitForReactHydration } from "./helpers/spa-settings-nav";

const base = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

test.describe("language panel regions", () => {
  test("opens with current region; no Frequent strip; search filters", async ({ page }) => {
    await page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
    await waitForReactHydration(page, '[data-testid="locale-toggle"]');
    await page.getByTestId("locale-toggle").click();
    await expect(page.getByTestId("locale-panel")).toBeVisible();
    await expect(page.getByTestId("locale-frequent")).toHaveCount(0);
    await expect(page.getByTestId("locale-search")).toBeVisible();
    // EN → global region opens by default; Europe stays collapsed.
    await expect(page.getByTestId("locale-option-en")).toBeVisible();
    await expect(page.getByTestId("locale-option-it")).toHaveCount(0);
    await page.getByTestId("locale-region-europe").getByRole("button").first().click();
    await expect(page.getByTestId("locale-option-it")).toBeVisible();
    await page.getByTestId("locale-search").fill("polski");
    await expect(page.getByTestId("locale-option-pl")).toBeVisible();
  });
});
