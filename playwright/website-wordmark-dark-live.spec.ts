/**
 * Live /en: dark theme must not paint the on-light wordmark.
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test playwright/website-wordmark-dark-live.spec.ts
 */
import { expect, test } from "@playwright/test";

test("live /en dark: on-light wordmark not visible", async ({ page }) => {
  const res = await page.goto("/en", { waitUntil: "domcontentloaded" });
  test.skip(!res || !res.ok(), "site not reachable — start vinext or set PLAYWRIGHT_BASE_URL");

  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  });

  const dark = page.locator(".brand-lockup img.brand-logo.brand-logo-on-dark");
  const light = page.locator(".brand-lockup img.brand-logo.brand-logo-on-light");
  await expect(dark).toBeVisible();
  await expect(light).not.toBeVisible();

  // Halt primary CTA proves shield.css (not just Tailwind) is on the page.
  const run = page.locator(".shell .primary-button").first();
  if ((await run.count()) > 0) {
    const bg = await run.evaluate((el) => getComputedStyle(el).backgroundColor);
    // --halt #ff4d00
    expect(bg).toMatch(/rgb\(\s*255,\s*77,\s*0\s*\)/);
  }
});
