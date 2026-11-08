/**
 * Production: /zh → /zh-Hans alias redirect (CI network).
 *
 *   PLAYWRIGHT_BASE_URL=https://buusdocst.mtsu.workers.dev npm run test:playwright:zh-alias
 *
 * Skips when origin unreachable (local CF timeout ≠ failure).
 */
import { expect, test } from "@playwright/test";

const base = (
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.PRODUCTION_HEALTH_URL ||
  process.env.STAGING_HEALTH_URL ||
  ""
)
  .trim()
  .replace(/\/$/, "");

async function originReachable(): Promise<boolean> {
  if (!base) return false;
  try {
    const res = await fetch(`${base}/api/health`, {
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: "application/json" }
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { ok?: boolean; curatedListPresent?: boolean };
    return data?.ok === true && data?.curatedListPresent === true;
  } catch {
    return false;
  }
}

test.describe("production zh alias", () => {
  test.beforeAll(async () => {
    if (!base) {
      test.skip(true, "Set PLAYWRIGHT_BASE_URL or PRODUCTION_HEALTH_URL");
    }
    const ok = await originReachable();
    if (!ok) {
      test.skip(true, `Origin unreachable: ${base}`);
    }
  });

  test("/zh redirects to /zh-Hans", async ({ page }) => {
    await page.goto(`${base}/zh`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await expect(page).toHaveURL(/\/zh-Hans(?:\/|$|\?)/, { timeout: 20_000 });
    await expect(page.getByTestId("locale-select")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("locale-select")).toHaveValue("zh-Hans");
  });

  test("/zh-CN redirects to /zh-Hans", async ({ page }) => {
    await page.goto(`${base}/zh-CN`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await expect(page).toHaveURL(/\/zh-Hans(?:\/|$|\?)/, { timeout: 20_000 });
  });

  test("/zh-SG redirects to /zh-Hans", async ({ page }) => {
    await page.goto(`${base}/zh-SG`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await expect(page).toHaveURL(/\/zh-Hans(?:\/|$|\?)/, { timeout: 20_000 });
    await expect(page.getByTestId("locale-select")).toHaveValue("zh-Hans");
  });
});
