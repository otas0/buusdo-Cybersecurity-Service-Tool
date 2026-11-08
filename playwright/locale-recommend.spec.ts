/**
 * LocaleRecommendModal — hard-fail when navigator.languages forces zh and dialog never opens.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 \
 *     npx playwright test playwright/locale-recommend.spec.ts
 */
import { expect, test } from "@playwright/test";
import { waitForReactHydration } from "./helpers/spa-settings-nav";

const base = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

test.describe("locale recommend soft prompt", () => {
  test("first /en visit opens recommend when Accept-Language prefers zh", async ({ page, context }) => {
    await context.addInitScript(() => {
      try {
        localStorage.removeItem("buusdocst-locale-choice");
        localStorage.removeItem("buusdocst-locale-recommend-dismiss");
        Object.defineProperty(navigator, "languages", {
          get: () => ["zh-CN", "zh", "en-US"],
          configurable: true
        });
        Object.defineProperty(navigator, "language", {
          get: () => "zh-CN",
          configurable: true
        });
      } catch {
        /* ignore */
      }
    });

    await page.goto(`${base}/en`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await waitForReactHydration(page, '[data-testid="locale-select"]').catch(() => undefined);

    const dialog = page.getByTestId("locale-recommend");
    await expect(dialog, "locale-recommend must open when navigator.languages prefers zh on /en").toBeVisible({
      timeout: 15_000
    });

    await page.getByTestId("locale-recommend-dismiss").click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("locale-recommend")).toHaveCount(0);
  });
});
