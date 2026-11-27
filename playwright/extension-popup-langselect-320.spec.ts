/**
 * Slim popup stays short/narrow — no langSelect chrome.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/extension-popup-langselect-320.spec.ts
 */
import { test, expect } from "@playwright/test";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

test("popup CSS clamps width; no langSelect", () => {
  const css = readFileSync("extension/popup/popup.css", "utf8");
  const html = readFileSync("extension/popup/popup.html", "utf8");
  expect(css).toMatch(/width:\s*300px/);
  expect(css).toMatch(/max-height:\s*280px/);
  expect(html).not.toMatch(/id="langSelect"/);
  expect(html).toMatch(/id="manageListsLink"/);
});

test("file popup at 320px: body ≤ 300px wide, no locale select", async ({ page }) => {
  const popupUrl = pathToFileURL(path.resolve("extension/popup/popup.html")).href;
  await page.setViewportSize({ width: 320, height: 600 });
  await page.goto(popupUrl);
  await expect(page.locator("#langSelect")).toHaveCount(0);
  await expect(page.getByTestId("extension-manage-lists")).toBeVisible();
  const body = await page.locator("body").boundingBox();
  expect(body).toBeTruthy();
  expect(body!.width).toBeLessThanOrEqual(320);
});
