/**
 * Language panel: Frequent strip + search + region accordion.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/locale-panel-regions.spec.ts
 */
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { waitForReactHydration } from "./helpers/spa-settings-nav";

const base = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const afPack = JSON.parse(readFileSync("i18n/packs/af.json", "utf8")) as {
  langPanelSearchPlaceholder: string;
  langPanelNoMatches: string;
};

test.describe("language panel regions", () => {
  test("opens with Frequent strip + current region; Arrow moves focus; search filters", async ({
    page
  }) => {
    await page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
    await waitForReactHydration(page, '[data-testid="locale-toggle"]');
    await page.getByTestId("locale-toggle").click();
    await expect(page.getByTestId("locale-panel")).toBeVisible();
    await expect(page.getByTestId("locale-frequent")).toBeVisible();
    await expect(page.getByTestId("locale-frequent").locator("button")).toHaveCount(5);
    await page.getByTestId("locale-frequent-option-en").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("locale-frequent-option-zh-Hans")).toBeFocused();
    await expect(page.getByTestId("locale-search")).toHaveAttribute(
      "placeholder",
      /Search language/i
    );
    await expect(page.getByTestId("locale-option-en")).toBeVisible();
    await expect(page.getByTestId("locale-option-it")).toHaveCount(0);
    await page.getByTestId("locale-region-europe").getByRole("button").first().click();
    await expect(page.getByTestId("locale-option-it")).toBeVisible();
    await page.getByTestId("locale-search").fill("polski");
    await expect(page.getByTestId("locale-option-pl")).toBeVisible();
    await expect(page.getByTestId("locale-frequent")).toHaveCount(0);
  });

  test("search placeholder + empty state use localized pack keys on /af", async ({ page }) => {
    await page.goto(`${base}/af`, { waitUntil: "domcontentloaded" });
    await waitForReactHydration(page, '[data-testid="locale-toggle"]');
    await page.getByTestId("locale-toggle").click();
    await expect(page.getByTestId("locale-search")).toHaveAttribute(
      "placeholder",
      afPack.langPanelSearchPlaceholder
    );
    await page.getByTestId("locale-search").fill("zzzz-no-such-locale");
    await expect(page.getByTestId("locale-empty")).toHaveText(afPack.langPanelNoMatches);
  });
});
