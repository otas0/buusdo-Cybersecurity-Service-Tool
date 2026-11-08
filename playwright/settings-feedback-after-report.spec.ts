/**
 * Settings empty-state after-report hint (session flag, no drafts).
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:playwright:settings-feedback-after-report
 */
import { expect, test } from "@playwright/test";
import { waitForReactHydration } from "./helpers/spa-settings-nav";

const base = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");

async function baseReachable(): Promise<boolean> {
  try {
    const res = await fetch(base, { signal: AbortSignal.timeout(4000) });
    return res.status > 0;
  } catch {
    return false;
  }
}

test("Settings shows after-report hint when drafts empty but last mark was report", async ({
  page
}) => {
  if (!(await baseReachable())) {
    test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
    return;
  }

  await page.goto(`${base}/en/settings#settings-feedback-drafts`, {
    waitUntil: "domcontentloaded"
  });
  await waitForReactHydration(page, '[data-testid="settings-feedback-drafts"]');

  await page.evaluate(() => {
    localStorage.setItem("shieldPrivacyMode", "local");
    localStorage.removeItem("shieldFeedbackDrafts");
    sessionStorage.setItem("shieldFeedbackLastReport", "1");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForReactHydration(page, '[data-testid="settings-feedback-drafts"]');
  await page.locator("#settings-feedback-drafts").scrollIntoViewIfNeeded();

  await expect(page.getByTestId("settings-feedback-drafts")).toBeVisible();
  await expect(page.getByTestId("feedback-drafts-empty-after-report")).toBeVisible();
  await expect(page.getByTestId("feedback-drafts-empty-after-report")).toContainText(
    /export|batches|threat:apply|rascunho|denúncia/i
  );
});
