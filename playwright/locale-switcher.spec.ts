import { test, expect } from "@playwright/test";
import { waitForReactHydration } from "./helpers/spa-settings-nav";

const base = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

async function selectLocale(page: import("@playwright/test").Page, id: string) {
  const select = page.getByTestId("locale-select");
  await waitForReactHydration(page, '[data-testid="locale-select"]');
  await Promise.all([
    page.waitForURL(new RegExp(`/${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:/|\\?|#|$)`)),
    select.selectOption(id)
  ]);
}

test.describe("multi-locale switcher", () => {
  test("select lists regions and switches EN → zh-Hans → mi → pt-PT", async ({ page }) => {
    await page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
    const select = page.getByTestId("locale-select");
    // Native select is visually hidden; panel is the product picker.
    await expect(page.getByTestId("locale-toggle")).toBeVisible();
    await page.getByTestId("locale-toggle").click();
    await expect(page.getByTestId("locale-panel")).toBeVisible();
    await expect(page.getByTestId("locale-search")).toBeVisible();
    await expect(page.getByTestId("locale-region-europe")).toBeVisible();

    const labels = await select.locator("optgroup").evaluateAll((groups) =>
      groups.map((g) => g.getAttribute("label") || "")
    );
    expect(labels.join(" ")).toMatch(/Europe/i);
    expect(labels.join(" ")).toMatch(/Southeast Asia|Southern Africa|Pacific|East Asia/i);

    await page.keyboard.press("Escape");
    await selectLocale(page, "zh-Hans");
    await expect(page.getByRole("navigation")).toContainText(/设置|設定|检查|檢查/);

    await selectLocale(page, "mi");
    await selectLocale(page, "pt-PT");
    await expect(page.getByRole("navigation")).toContainText(/Verificar|Definições|Privacidade/);
  });

  test("SEA and JA routes render Halt chrome keys", async ({ page }) => {
    await page.goto(`${base}/th`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("locale-select")).toHaveValue("th");
    await page.goto(`${base}/ja`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("locale-select")).toHaveValue("ja");
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  });
});
