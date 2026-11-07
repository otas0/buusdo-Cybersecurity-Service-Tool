/**
 * Production privacy smoke (EN + pt-PT).
 *
 *   PLAYWRIGHT_BASE_URL=https://buusdocst.mtsu.workers.dev npm run test:playwright:privacy
 *
 * Skips when the origin is unreachable (e.g. local CF timeout) so CI/laptops
 * without workers.dev access do not fail the suite falsely.
 */
import { expect, test } from "@playwright/test";

const base = (
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.PRODUCTION_HEALTH_URL ||
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

test.describe("production privacy pages", () => {
  test.beforeAll(async () => {
    if (!base) {
      test.skip(true, "Set PLAYWRIGHT_BASE_URL or PRODUCTION_HEALTH_URL to the Cloudflare origin");
    }
    const ok = await originReachable();
    if (!ok) {
      test.skip(
        true,
        `Origin unreachable or unhealthy: ${base} (see docs/LOCAL_CF_CONNECTIVITY.md)`
      );
    }
  });

  test("/en/privacy shows policy", async ({ page }) => {
    await page.goto(`${base}/en/privacy`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("privacy-policy")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Privacy policy/i })).toBeVisible();
    await expect(page.getByTestId("privacy-policy-updated")).toContainText(/2026/);
    await expect(page.getByTestId("privacy-honest-limits")).toBeVisible();
    await expect(page.getByTestId("privacy-honest-limits")).toContainText(/No TLS decryption/i);
  });

  test("/en/privacy#privacy-honest-limits deep-link", async ({ page }) => {
    await page.goto(`${base}/en/privacy#privacy-honest-limits`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#privacy-honest-limits")).toBeVisible();
    await expect(page.getByTestId("privacy-honest-limits")).toBeVisible();
  });

  test("/pt-PT/privacy shows policy", async ({ page }) => {
    await page.goto(`${base}/pt-PT/privacy`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("privacy-policy")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Política de privacidade/i })).toBeVisible();
    await expect(page.getByTestId("privacy-honest-limits")).toBeVisible();
    await expect(page.getByTestId("privacy-honest-limits")).toContainText(/Sem desencriptação TLS/i);
  });

  test("/en/settings shows desktop download slots", async ({ page }) => {
    await page.goto(`${base}/en/settings#settings-desktop`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#settings-desktop")).toBeVisible();
    await expect(page.getByTestId("settings-desktop-downloads")).toBeVisible();
    await expect(page.getByTestId("settings-desktop-honest-limits")).toBeVisible();
    await expect(page.getByTestId("settings-desktop-release-tag")).toBeVisible();
  });

  test("/pt-PT/settings shows desktop download slots", async ({ page }) => {
    await page.goto(`${base}/pt-PT/settings#settings-desktop`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#settings-desktop")).toBeVisible();
    await expect(page.getByTestId("settings-desktop-downloads")).toBeVisible();
    await expect(page.getByTestId("settings-desktop-honest-limits")).toBeVisible();
  });
});