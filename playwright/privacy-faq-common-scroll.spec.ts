/**
 * SPA hash scroll for #privacy-faq-common (same pattern as honest-limits).
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

test("SPA hashchange scrolls #privacy-faq-common into view", async ({ page }) => {
  if (!(await baseReachable())) {
    test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
    return;
  }

  await page.goto(`${base}/en/privacy`, { waitUntil: "domcontentloaded" });
  await waitForReactHydration(page, '[data-testid="privacy-faq-common"]');
  await expect(page.getByTestId("privacy-faq-common")).toBeVisible();

  await page.evaluate(() => {
    history.replaceState(null, "", "#privacy-faq-common");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

  await expect(page).toHaveURL(/#privacy-faq-common/);
  await assertHashSectionInView(page, "#privacy-faq-common");
});

test("direct deep-link /en/privacy#privacy-faq-common lands in view", async ({ page }) => {
  if (!(await baseReachable())) {
    test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
    return;
  }

  await page.goto(`${base}/en/privacy#privacy-faq-common`, { waitUntil: "domcontentloaded" });
  await waitForReactHydration(page, '[data-testid="privacy-faq-common"]');
  await assertHashSectionInView(page, "#privacy-faq-common");
});
