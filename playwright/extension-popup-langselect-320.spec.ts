/**
 * Popup #langSelect stays within 320px width with Southern Africa optgroup.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/extension-popup-langselect-320.spec.ts
 */
import { test, expect } from "@playwright/test";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

test("popup CSS clamps lang select; SA optgroup present", () => {
  const css = readFileSync("extension/popup/popup.css", "utf8");
  const html = readFileSync("extension/popup/popup.html", "utf8");
  expect(css).toMatch(/\.lang\s*\{[\s\S]*max-width/);
  expect(css).toMatch(/text-overflow:\s*ellipsis/);
  expect(html).toMatch(/data-i18n-label="langRegionSouthernAfrica"/);
  expect(html).toMatch(/<option value="af"/);
  expect(html).toMatch(/<option value="zu"/);
});

test("file popup at 320px: lang select width ≤ body", async ({ page }) => {
  const popupUrl = pathToFileURL(path.resolve("extension/popup/popup.html")).href;
  await page.setViewportSize({ width: 320, height: 600 });
  await page.goto(popupUrl);
  const select = page.getByTestId("extension-locale-select");
  await expect(select).toBeVisible();
  const box = await select.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.width).toBeLessThanOrEqual(320);
  expect(box!.x + box!.width).toBeLessThanOrEqual(321);
  await expect(select.locator('optgroup[data-i18n-label="langRegionSouthernAfrica"]')).toHaveCount(
    1
  );
});
