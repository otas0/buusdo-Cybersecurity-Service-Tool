/**
 * Sticky .shell .top background tracks computed --bg under Appearance toggle.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/sticky-top-theme-bg.spec.ts
 */
import { expect, test } from "@playwright/test";

const base = (
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.PRODUCTION_HEALTH_URL ||
  "http://localhost:3000"
)
  .trim()
  .replace(/\/$/, "");

async function resolvedBg(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.background = "var(--bg)";
    probe.style.position = "fixed";
    probe.style.left = "-9999px";
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return resolved;
  });
}

async function topBackground(page: import("@playwright/test").Page) {
  return page.locator(".shell .top").first().evaluate((el) => getComputedStyle(el).backgroundColor);
}

test("sticky top background equals --bg in dark and light", async ({ page }) => {
  await page.goto(`${base}/en`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  const top = page.locator(".shell .top").first();
  await expect(top).toBeVisible({ timeout: 15_000 });

  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  });
  expect(await topBackground(page)).toBe(await resolvedBg(page));

  const toggle = page.getByTestId("theme-switch");
  if ((await toggle.count()) > 0) {
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await topBackground(page)).toBe(await resolvedBg(page));
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await topBackground(page)).toBe(await resolvedBg(page));
  } else {
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "light";
      document.documentElement.style.colorScheme = "light";
    });
    expect(await topBackground(page)).toBe(await resolvedBg(page));
  }
});
