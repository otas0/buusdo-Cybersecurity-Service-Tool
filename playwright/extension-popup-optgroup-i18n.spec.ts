/**
 * Popup #langSelect optgroup labels flip with language (MessageBag keys).
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/extension-popup-optgroup-i18n.spec.ts
 */
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const popupUrl = pathToFileURL(
  path.resolve("extension/popup/popup.html")
).href;

const itPack = JSON.parse(readFileSync("i18n/packs/it.json", "utf8")) as {
  langRegionEurope: string;
  langRegionEastAsia: string;
};
const zhPack = JSON.parse(readFileSync("i18n/packs/zh-Hans.json", "utf8")) as {
  langRegionEurope: string;
  langRegionEastAsia: string;
};

test("optgroup labels follow it then zh-Hans selection", async ({ page }) => {
  await page.goto(popupUrl);
  const select = page.getByTestId("extension-locale-select");
  await expect(select).toBeVisible();

  await select.selectOption("it");
  // applyI18n runs on change — wait for Europe label
  await expect
    .poll(async () => {
      return page.locator('optgroup[data-i18n-label="langRegionEurope"]').getAttribute("label");
    })
    .toBe(itPack.langRegionEurope);

  await select.selectOption("zh-Hans");
  await expect
    .poll(async () => {
      return page.locator('optgroup[data-i18n-label="langRegionEastAsia"]').getAttribute("label");
    })
    .toBe(zhPack.langRegionEastAsia);
  await expect
    .poll(async () => {
      return page.locator('optgroup[data-i18n-label="langRegionEurope"]').getAttribute("label");
    })
    .toBe(zhPack.langRegionEurope);
});
