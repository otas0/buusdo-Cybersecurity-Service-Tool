/**
 * Sticky shell plate + scroll-margin for #privacy-honest-limits (light + dark).
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:playwright:privacy-honest-limits-scroll
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

for (const theme of ["light", "dark"] as const) {
  test(`#privacy-honest-limits deep-link in view (${theme} sticky plate)`, async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }

    await page.addInitScript((t) => {
      try {
        localStorage.setItem("shield-theme", t);
      } catch {
        /* ignore */
      }
      document.documentElement.setAttribute("data-theme", t);
    }, theme);

    await page.goto(`${base}/en/privacy#privacy-honest-limits`, {
      waitUntil: "domcontentloaded"
    });
    await waitForReactHydration(page, '[data-testid="privacy-honest-limits"]');
    await expect(page.getByTestId("privacy-honest-limits")).toBeVisible();
    await assertHashSectionInView(page, "#privacy-honest-limits");

    const plate = await page.evaluate(() => {
      const top = document.querySelector(".shell .top") as HTMLElement | null;
      if (!top) return null;
      const cs = getComputedStyle(top);
      return {
        background: cs.backgroundColor,
        boxShadow: cs.boxShadow,
        borderBottom: cs.borderBottom
      };
    });
    expect(plate).not.toBeNull();
    // Opaque plate: background not fully transparent; scroll-margin token applied on target.
    const bg = String(plate?.background || "");
    expect(bg === "rgba(0, 0, 0, 0)" || bg === "transparent").toBeFalsy();

    const margin = await page.evaluate(() => {
      const el = document.querySelector("#privacy-honest-limits") as HTMLElement | null;
      return el ? getComputedStyle(el).scrollMarginTop : "";
    });
    expect(margin).not.toBe("0px");
  });
}
