/**
 * Hard-assert account sign-in when ACCOUNT_SYNC_ENABLED=1.
 * CI: playwright-settings job sets the env; otherwise skip.
 *
 * Run: ACCOUNT_SYNC_ENABLED=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test playwright/account-sync.spec.ts
 */
import { expect, test } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

async function baseReachable(): Promise<boolean> {
  try {
    const res = await fetch(base, { signal: AbortSignal.timeout(4000) });
    return res.status > 0;
  } catch {
    return false;
  }
}

test.describe("Account sync signed-in flow", () => {
  test("magic request → consume → Settings shows signed-in", async ({ page, request }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }

    const health = await request.get(`${base}/api/health`).then((r) => r.json());
    if (!health?.accountSyncEnabled) {
      test.skip(true, "ACCOUNT_SYNC_ENABLED is off — enable in CI for this hard assert");
      return;
    }

    const email = `pw-${Date.now()}@example.com`;
    const magic = await request.post(`${base}/api/auth/magic/request`, {
      data: { email, client: "web" }
    });
    expect(magic.ok()).toBeTruthy();
    const magicBody = await magic.json();
    expect(magicBody.ok).toBe(true);
    expect(magicBody.devLink).toBeTruthy();

    // Follow consume (sets httpOnly session cookie).
    await page.goto(magicBody.devLink, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/settings/, { timeout: 15000 });

    await page.goto(`${base}/en/settings#settings-account`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("settings-account-signed-in")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("settings-account-signed-in")).toContainText(email);
    await expect(page.getByTestId("settings-account-sync-now")).toBeVisible();
    await expect(page.getByTestId("settings-account-export")).toBeVisible();
  });
});