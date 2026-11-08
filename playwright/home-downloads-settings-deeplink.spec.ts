/**
 * Home / result Downloads CTA → Settings #settings-desktop SPA scroll.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/home-downloads-settings-deeplink.spec.ts
 */
import { test, expect } from "@playwright/test";
import { waitForReactHydration } from "./helpers/spa-settings-nav";

const base = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

test("home Downloads CTA navigates to settings#settings-desktop in view", async ({ page }) => {
  await page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
  await waitForReactHydration(page, '[data-testid="home-downloads-cta"]');
  const cta = page.getByTestId("home-downloads-cta").getByRole("link");
  await expect(cta).toHaveAttribute("href", /\/en\/settings#settings-desktop/);
  await Promise.all([
    page.waitForURL(/\/en\/settings#settings-desktop/),
    cta.click()
  ]);
  await expect(page.getByTestId("settings-desktop-downloads")).toBeVisible({ timeout: 15000 });
  const top = await page.locator("#settings-desktop").evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeLessThan(page.viewportSize()!.height);
  expect(top).toBeGreaterThan(-40);
});
