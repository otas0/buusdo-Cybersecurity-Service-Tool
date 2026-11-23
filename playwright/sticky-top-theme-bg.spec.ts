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

async function topBoxShadow(page: import("@playwright/test").Page) {
  return page.locator(".shell .top").first().evaluate((el) => getComputedStyle(el).boxShadow);
}

async function assertStickyThemeChrome(page: import("@playwright/test").Page) {
  expect(await topBackground(page)).toBe(await resolvedBg(page));
  expect(await topBorderBottom(page)).toBe(await resolvedLine(page));
}

/** Opaque plate: box-shadow uses resolved --bg (0 1px 0 var(--bg)). */
async function assertStickyBoxShadowPlate(page: import("@playwright/test").Page) {
  const bg = await resolvedBg(page);
  const shadow = await topBoxShadow(page);
  expect(shadow).not.toBe("none");
  // rgb/rgba from --bg must appear in the plate shadow under light + dark.
  const rgb = bg.match(/rgba?\([^)]+\)/);
  expect(rgb, `expected resolvable --bg, got ${bg}`).toBeTruthy();
  expect(shadow).toContain(rgb![0]);
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
  await assertStickyBoxShadowPlate(page);

  const toggle = page.getByTestId("theme-switch");
  if ((await toggle.count()) > 0) {
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await assertStickyThemeChrome(page);
    await assertStickyBoxShadowPlate(page);
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await assertStickyThemeChrome(page);
    await assertStickyBoxShadowPlate(page);
  } else {
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "light";
      document.documentElement.style.colorScheme = "light";
    });
    await assertStickyThemeChrome(page);
    await assertStickyBoxShadowPlate(page);
  }
});

test("sticky plate under 360px: gap/logo only + scroll-margin token", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 720 });
  await page.goto(`${base}/en`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  const top = page.locator(".shell .top").first();
  await expect(top).toBeVisible({ timeout: 15_000 });

  await page.evaluate(() => {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  });
  await assertStickyThemeChrome(page);
  await assertStickyBoxShadowPlate(page);

  const geometry = await page.evaluate(() => {
    const shell = document.querySelector(".shell") as HTMLElement | null;
    const topEl = document.querySelector(".shell .top") as HTMLElement | null;
    const logo = document.querySelector(".shell .brand-logo") as HTMLElement | null;
    if (!shell || !topEl) return null;
    const shellCs = getComputedStyle(shell);
    const topCs = getComputedStyle(topEl);
    return {
      scrollMarginToken: shellCs.getPropertyValue("--shell-top-scroll-margin").trim(),
      topGap: topCs.gap,
      topPosition: topCs.position,
      topBg: topCs.backgroundColor,
      logoHeight: logo ? getComputedStyle(logo).height : ""
    };
  });
  expect(geometry).toBeTruthy();
  expect(geometry!.scrollMarginToken).toMatch(/[\d.]+rem/);
  expect(geometry!.topPosition).toBe("sticky");
  // Narrow MQ only shrinks gap/logo — plate stays shared sticky (bg + position).
  expect(parseFloat(geometry!.topGap)).toBeLessThanOrEqual(12);
  expect(parseFloat(geometry!.logoHeight)).toBeLessThanOrEqual(36);
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

  test(`#privacy-faq-common scroll-margin under ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => {
      try {
        localStorage.setItem("shield-theme", t);
      } catch {
        /* ignore */
      }
      document.documentElement.setAttribute("data-theme", t);
    }, theme);

    await page.goto(`${base}/en/privacy#privacy-faq-common`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000
    });
    const section = page.locator("#privacy-faq-common");
    if ((await section.count()) === 0) {
      test.skip(true, "#privacy-faq-common missing on this origin");
      return;
    }
    await expect(section).toBeVisible({ timeout: 15_000 });
    const margin = await page.evaluate(() => {
      const el = document.querySelector("#privacy-faq-common") as HTMLElement | null;
      return el ? getComputedStyle(el).scrollMarginTop : "";
    });
    expect(margin).not.toBe("0px");
    expect(margin).not.toBe("");
    await assertStickyThemeChrome(page);
  });
}
