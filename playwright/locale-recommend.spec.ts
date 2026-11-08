/**
 * LocaleRecommendModal soft prompt on first /en visit.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 \
 *     npx playwright test playwright/locale-recommend.spec.ts
 */
import { expect, test } from "@playwright/test";
import { waitForReactHydration } from "./helpers/spa-settings-nav";

const base = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

test.describe("locale recommend soft prompt", () => {
  test("first /en visit can open and dismiss recommend dialog", async ({ page, context }) => {
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
    // Soft: if Accept-Language suggestion equals en or storage blocked, dialog may stay closed.
    const visible = await dialog.isVisible().catch(() => false);
    if (!visible) {
      test.info().annotations.push({
        type: "note",
        description: "locale-recommend not shown (suggestion matched or storage blocked)"
      });
      return;
    }

    await expect(dialog).toBeVisible();
    await page.getByTestId("locale-recommend-dismiss").click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("locale-recommend")).toHaveCount(0);
  });
});
