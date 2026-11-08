/**
 * Language panel: Frequent strip + collapsed regions (no full dump on open).
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/locale-panel-frequent.spec.ts
 */
import { test, expect } from "@playwright/test";
import { waitForReactHydration } from "./helpers/spa-settings-nav";

const base = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

test.describe("language panel frequent strip", () => {
  test("opens compact panel with Frequent; Europe region stays collapsed until expand", async ({
    page
  }) => {
    await page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
    await waitForReactHydration(page, '[data-testid="locale-toggle"]');
    await page.getByTestId("locale-toggle").click();
    await expect(page.getByTestId("locale-panel")).toBeVisible();
    await expect(page.getByTestId("locale-frequent")).toBeVisible();
    await expect(page.getByTestId("locale-search")).toBeVisible();
    // Region languages hidden until expand (accordion closed).
    await expect(page.getByTestId("locale-option-region-it")).toHaveCount(0);
    await page.getByTestId("locale-region-europe").getByRole("button").first().click();
    await expect(page.getByTestId("locale-option-region-it")).toBeVisible();
    // Search filters without expanding every region dump.
    await page.getByTestId("locale-search").fill("polski");
    await expect(page.getByTestId("locale-option-region-pl")).toBeVisible();
  });
});
