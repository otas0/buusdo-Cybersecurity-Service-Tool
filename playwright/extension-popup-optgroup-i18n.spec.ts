/**
 * Slim popup: language follows OS — no optgroup UI. Assert catalog + packs still exist.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/extension-popup-optgroup-i18n.spec.ts
 */
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const popupUrl = pathToFileURL(path.resolve("extension/popup/popup.html")).href;

test("popup has no locale optgroups; manage lists link present", async ({ page }) => {
  await page.goto(popupUrl);
  await expect(page.locator("#langSelect")).toHaveCount(0);
  await expect(page.locator("optgroup")).toHaveCount(0);
  await expect(page.getByTestId("extension-manage-lists")).toBeVisible();

  const itPack = JSON.parse(readFileSync("i18n/packs/it.json", "utf8")) as {
    langRegionEurope: string;
  };
  const zhPack = JSON.parse(readFileSync("i18n/packs/zh-Hans.json", "utf8")) as {
    langRegionEastAsia: string;
  };
  expect(itPack.langRegionEurope).toBe("Europa");
  expect(zhPack.langRegionEastAsia).toBe("东亚");
});
