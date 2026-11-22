/**
 * Home / result Downloads CTA → /downloads page.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/home-downloads-settings-deeplink.spec.ts
 */
import { test, expect } from "@playwright/test";
import { waitForReactHydration } from "./helpers/spa-settings-nav";

test("home Downloads CTA navigates to /downloads", async ({ page }) => {
  await page.goto("/en");
  await waitForReactHydration(page, '[data-testid="home-downloads-cta"]');
  const cta = page.getByTestId("home-downloads-cta").getByRole("link");
  await expect(cta).toHaveAttribute("href", /\/en\/downloads/);
  await Promise.all([
    page.waitForURL(/\/en\/downloads/),
    cta.click()
  ]);
  await expect(page.getByTestId("downloads-page")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("settings-desktop-downloads")).toBeVisible();
  await expect(page.getByTestId("downloads-extension")).toBeVisible();
});
