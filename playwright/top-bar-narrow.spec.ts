/**
 * Top bar + locale badge at 320 / 375 — visual regression floors.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 \
 *     npx playwright test playwright/top-bar-narrow.spec.ts
 *
 * Snapshots: playwright/__screenshots__/top-bar-narrow.spec.ts/
 */
import { expect, test } from "@playwright/test";
import { waitForReactHydration } from "./helpers/spa-settings-nav";

const base = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

for (const width of [320, 375] as const) {
  test(`top bar brand + locale badge @ ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await page.goto(`${base}/en`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await waitForReactHydration(page, '[data-testid="locale-select"]').catch(() => undefined);

    const top = page.locator(".shell .top").first();
    await expect(top).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".shell .brand-logo").first()).toBeVisible();
    await expect(page.getByTestId("locale-select")).toBeVisible();

    // Badge is CSS-shown under 720px
    const badge = page.getByTestId("locale-toggle");
    await expect(badge).toBeVisible();

    const box = await top.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeLessThan(120);
    expect(box!.width).toBeLessThanOrEqual(width + 1);

    // Visual baseline: set UPDATE_TOP_BAR_SHOTS=1 (or Playwright --update-snapshots) to refresh.
    if (process.env.UPDATE_TOP_BAR_SHOTS === "1" || process.env.PLAYWRIGHT_UPDATE_SNAPSHOTS === "1") {
      await expect(top).toHaveScreenshot(`top-bar-${width}.png`, {
        animations: "disabled",
        maxDiffPixelRatio: 0.08
      });
    } else {
      // Geometry regression without requiring committed PNGs in every clone.
      const logoBox = await page.locator(".shell .brand-logo").first().boundingBox();
      const badgeBox = await badge.boundingBox();
      expect(logoBox).toBeTruthy();
      expect(badgeBox).toBeTruthy();
      expect(logoBox!.x + logoBox!.width).toBeLessThanOrEqual((badgeBox!.x || width) + 8);
    }
  });
}
