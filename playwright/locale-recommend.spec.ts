/**
 * LocaleRecommendModal — hard-fail when navigator.languages forces zh and dialog never opens.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 \
 *     npx playwright test playwright/locale-recommend.spec.ts
 */
import { expect, test } from "@playwright/test";
import { waitForReactHydration } from "./helpers/spa-settings-nav";

const base = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

test.describe("locale recommend soft prompt", () => {
  test("first /en visit opens recommend when Accept-Language prefers zh", async ({ page, context }) => {
    await context.addInitScript(() => {
      try {
        localStorage.removeItem("buusdocst-locale-choice");
        localStorage.removeItem("buusdocst-locale-recommend-dismiss");
        Object.defineProperty(navigator, "languages", {
          get: () => ["zh-CN", "zh", "en-US"],
          configurable: true
        });
        Object.defineProperty(navigator, "language", {
          get: () => "zh-CN",
          configurable: true
        });
      } catch {
        /* ignore */
      }
    });

    await page.goto(`${base}/en`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await waitForReactHydration(page, '[data-testid="locale-select"]').catch(() => undefined);

    const dialog = page.getByTestId("locale-recommend");
    await expect(dialog, "locale-recommend must open when navigator.languages prefers zh on /en").toBeVisible({
      timeout: 15_000
    });
    // No "Keep English" stay CTA; dismiss / accept / select only.
    await expect(page.getByTestId("locale-recommend-stay")).toHaveCount(0);
    await expect(page.getByText(/Keep English|Manter inglês|保持英文/i)).toHaveCount(0);

    await page.getByTestId("locale-recommend-dismiss").click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
    await expect(page.getByTestId("locale-recommend-suppressed")).toHaveCount(0);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("locale-recommend")).toHaveCount(0);
    await expect(page.getByText(/Keep English|Manter inglês|保持英文/i)).toHaveCount(0);
  });

  test("recommend search Deutsch accepts → /de", async ({ page, context }) => {
    await context.addInitScript(() => {
      try {
        localStorage.removeItem("buusdocst-locale-choice");
        localStorage.removeItem("buusdocst-locale-recommend-dismiss");
        Object.defineProperty(navigator, "languages", {
          get: () => ["zh-CN", "en-US"],
          configurable: true
        });
        Object.defineProperty(navigator, "language", {
          get: () => "zh-CN",
          configurable: true
        });
      } catch {
        /* ignore */
      }
    });

    await page.goto(`${base}/en`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await waitForReactHydration(page, '[data-testid="locale-recommend"]').catch(() => undefined);
    const dialog = page.getByTestId("locale-recommend");
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("locale-recommend-search")).toBeVisible();
    // Empty search: at most 6 pinned options.
    const pinned = dialog.locator('[data-testid^="locale-recommend-option-"]');
    await expect(pinned).toHaveCount(await pinned.count());
    expect(await pinned.count()).toBeLessThanOrEqual(6);

    await page.getByTestId("locale-recommend-search").fill("Deutsch");
    await expect(page.getByTestId("locale-recommend-option-de")).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/de(?:\/|\?|#|$)/),
      page.getByTestId("locale-recommend-option-de").click()
    ]);
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
  });

  for (const { tag, expectedHint } of [
    { tag: "xh-ZA", expectedHint: /isiXhosa|Xhosa|xh/i },
    { tag: "th-TH", expectedHint: /ไทย|Thai|th/i },
    { tag: "af-ZA", expectedHint: /Afrikaans|af/i },
    { tag: "zu-ZA", expectedHint: /isiZulu|Zulu|zu/i },
    { tag: "ss-ZA", expectedHint: /siSwati|Swati|ss/i },
    { tag: "ve-ZA", expectedHint: /Venda|Tshiven|ve/i },
    { tag: "ts-ZA", expectedHint: /Xitsonga|Tsonga|ts/i },
    { tag: "nr-ZA", expectedHint: /Ndebele|isiNdebele|nr/i },
    { tag: "st-ZA", expectedHint: /Sesotho|Sotho|st/i },
    { tag: "tn-ZA", expectedHint: /Setswana|Tswana|tn/i },
    { tag: "nso-ZA", expectedHint: /Sesotho sa Leboa|Northern Sotho|nso/i }
  ] as const) {
    test(`first /en visit opens recommend when Accept-Language prefers ${tag}`, async ({
      page,
      context
    }) => {
      await context.addInitScript((lang) => {
        try {
          localStorage.removeItem("buusdocst-locale-choice");
          localStorage.removeItem("buusdocst-locale-recommend-dismiss");
          Object.defineProperty(navigator, "languages", {
            get: () => [lang, "en-US"],
            configurable: true
          });
          Object.defineProperty(navigator, "language", {
            get: () => lang,
            configurable: true
          });
        } catch {
          /* ignore */
        }
      }, tag);

      await page.goto(`${base}/en`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await waitForReactHydration(page, '[data-testid="locale-select"]').catch(() => undefined);

      const dialog = page.getByTestId("locale-recommend");
      await expect(dialog, `locale-recommend must open for ${tag}`).toBeVisible({ timeout: 15_000 });
      await expect(dialog).toContainText(expectedHint);
      await page.getByTestId("locale-recommend-dismiss").click();
      await expect(dialog).toBeHidden({ timeout: 10_000 });
    });
  }
});
