import { test, expect } from "@playwright/test";

const base = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

test.describe("locale recommend modal", () => {
  test("dismiss stores choice and does not show again", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("buusdocst-locale-choice");
        localStorage.removeItem("buusdocst-locale-recommend-dismiss");
        Object.defineProperty(navigator, "languages", {
          get: () => ["ja-JP", "en-US"],
          configurable: true
        });
      } catch {
        /* ignore */
      }
    });

    await page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
    const modal = page.getByTestId("locale-recommend");
    await expect(modal).toBeVisible({ timeout: 10000 });
    await page.getByTestId("locale-recommend-dismiss").click();
    await expect(modal).toHaveCount(0);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("locale-recommend")).toHaveCount(0);
  });
});
