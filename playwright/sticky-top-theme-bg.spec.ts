/**
 * Sticky .shell .top background tracks computed --bg under Appearance toggle;
 * border-bottom tracks computed --line in both themes.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/sticky-top-theme-bg.spec.ts
 */
import { expect, test } from "@playwright/test";

const base = (
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.PRODUCTION_HEALTH_URL ||
  "http://localhost:3000"
)
  .trim()
  .replace(/\/$/, "");

async function resolvedBg(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.background = "var(--bg)";
    probe.style.position = "fixed";
    probe.style.left = "-9999px";
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return resolved;
  });
}

async function resolvedLine(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.borderBottom = "1px solid var(--line)";
    probe.style.position = "fixed";
    probe.style.left = "-9999px";
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).borderBottomColor;
    probe.remove();
    return resolved;
  });
}

async function topBackground(page: import("@playwright/test").Page) {
  return page.locator(".shell .top").first().evaluate((el) => getComputedStyle(el).backgroundColor);
}

async function topBorderBottom(page: import("@playwright/test").Page) {
  return page.locator(".shell .top").first().evaluate((el) => getComputedStyle(el).borderBottomColor);
}

async function assertStickyThemeChrome(page: import("@playwright/test").Page) {
  expect(await topBackground(page)).toBe(await resolvedBg(page));
  expect(await topBorderBottom(page)).toBe(await resolvedLine(page));
}

async function downloadsExtensionScrollMargin(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const el = document.querySelector("#downloads-extension") as HTMLElement | null;
    return el ? getComputedStyle(el).scrollMarginTop : "";
  });
}

test("sticky top background equals --bg and border uses --line in dark and light", async ({
  page
}) => {
  await page.goto(`${base}/en`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  const top = page.locator(".shell .top").first();
  await expect(top).toBeVisible({ timeout: 15_000 });

  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  });
  await assertStickyThemeChrome(page);

  const toggle = page.getByTestId("theme-switch");
  if ((await toggle.count()) > 0) {
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await assertStickyThemeChrome(page);
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await assertStickyThemeChrome(page);
  } else {
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "light";
      document.documentElement.style.colorScheme = "light";
    });
    await assertStickyThemeChrome(page);
  }
});

for (const theme of ["light", "dark"] as const) {
  test(`#downloads-extension scroll-margin under ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => {
      try {
        localStorage.setItem("shield-theme", t);
      } catch {
        /* ignore */
      }
      document.documentElement.setAttribute("data-theme", t);
    }, theme);

    await page.goto(`${base}/en/downloads#downloads-extension`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000
    });
    const section = page.locator("#downloads-extension");
    if ((await section.count()) === 0) {
      test.skip(true, "#downloads-extension missing on this origin");
      return;
    }
    await expect(section).toBeVisible({ timeout: 15_000 });
    const margin = await downloadsExtensionScrollMargin(page);
    expect(margin).not.toBe("0px");
    expect(margin).not.toBe("");
    await assertStickyThemeChrome(page);
  });
}
