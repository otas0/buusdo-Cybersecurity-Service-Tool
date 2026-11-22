/**
 * Downloads deep-link #downloads-extension at narrow viewport + smoke screenshot.
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:playwright:downloads-extension-narrow
 */
import { existsSync, mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { assertHashSectionInView, waitForReactHydration } from "./helpers/spa-settings-nav";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

async function baseReachable(): Promise<boolean> {
  try {
    const res = await fetch(base, { signal: AbortSignal.timeout(4000) });
    return res.status > 0;
  } catch {
    return false;
  }
}

test("narrow /en/downloads#downloads-extension lands in view + smoke shot", async ({ page }) => {
  if (!(await baseReachable())) {
    test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
    return;
  }
  mkdirSync("playwright/output", { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/en/downloads#downloads-extension`, {
    waitUntil: "domcontentloaded"
  });
  await waitForReactHydration(page, '[data-testid="downloads-extension"]');
  await expect(page.getByTestId("downloads-extension")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("downloads-extension-store-only")).toBeVisible();
  await assertHashSectionInView(page, "#downloads-extension");

  const shot = "playwright/output/downloads-extension-narrow-390.png";
  await page.getByTestId("downloads-extension").screenshot({ path: shot });
  expect(existsSync(shot)).toBeTruthy();
});
