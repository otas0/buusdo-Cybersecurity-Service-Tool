/**
 * SPA hash scroll for #privacy-faq-parents (same pattern as honest-limits).
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:playwright:privacy-faq-scroll
 */
import { expect, test } from "@playwright/test";
import {
  assertHashSectionInView,
  waitForReactHydration
} from "./helpers/spa-settings-nav";

const base = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");

async function baseReachable(): Promise<boolean> {
  try {
    const res = await fetch(base, { signal: AbortSignal.timeout(4000) });
    return res.status > 0;
  } catch {
    return false;
  }
}

test("SPA hashchange scrolls #privacy-faq-parents into view", async ({ page }) => {
  if (!(await baseReachable())) {
    test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
    return;
  }

  await page.goto(`${base}/en/privacy`, { waitUntil: "domcontentloaded" });
  await waitForReactHydration(page, '[data-testid="privacy-faq-parents"]');
  await expect(page.getByTestId("privacy-faq-parents")).toBeVisible();

  await page.evaluate(() => {
    history.replaceState(null, "", "#privacy-faq-parents");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

  await expect(page).toHaveURL(/#privacy-faq-parents/);
  await assertHashSectionInView(page, "#privacy-faq-parents");
  await expect(page.getByTestId("privacy-round2-survey")).toBeVisible();
});

test("direct deep-link /en/privacy#privacy-faq-parents lands in view", async ({ page }) => {
  if (!(await baseReachable())) {
    test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
    return;
  }

  await page.goto(`${base}/en/privacy#privacy-faq-parents`, { waitUntil: "domcontentloaded" });
  await waitForReactHydration(page, '[data-testid="privacy-faq-parents"]');
  await assertHashSectionInView(page, "#privacy-faq-parents");
});
