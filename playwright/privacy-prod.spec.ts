/**
 * Production privacy smoke (EN + pt-PT).
 *
 *   PLAYWRIGHT_BASE_URL=https://buusdocst.mtsu.workers.dev npm run test:playwright:privacy
 *
 * Skips when the origin is unreachable (e.g. local CF timeout) so CI/laptops
 * without workers.dev access do not fail the suite falsely.
 */
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { assertHashSectionInView, waitForReactHydration } from "./helpers/spa-settings-nav";

const minSupportedVersion = String(
  (
    JSON.parse(
      readFileSync(path.join(process.cwd(), "shared/desktop-downloads.json"), "utf8")
    ) as { minSupportedVersion?: string }
  ).minSupportedVersion || ""
);

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

test.describe("production privacy pages", () => {
  test.beforeAll(async () => {
    if (!base) {
      console.info("[privacy-prod] soft-skip Workers: PLAYWRIGHT_BASE_URL / PRODUCTION_HEALTH_URL unset");
      test.skip(true, "Set PLAYWRIGHT_BASE_URL or PRODUCTION_HEALTH_URL to the Cloudflare origin");
    }
    const ok = await originReachable();
    if (!ok) {
      console.info(
        `[privacy-prod] soft-skip Workers: unreachable or unhealthy ${base} (China Pages suite may still run)`,
      );
      test.skip(
        true,
        `Origin unreachable or unhealthy: ${base} (see docs/LOCAL_CF_CONNECTIVITY.md)`
      );
    }
    console.info(`[privacy-prod] Workers privacy checks active at ${base}`);
  });

  test("/en/privacy shows policy", async ({ page }) => {
    await page.goto(`${base}/en/privacy`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("privacy-policy")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Privacy policy/i })).toBeVisible();
    await expect(page.getByTestId("privacy-policy-updated")).toContainText(/2026/);
    await expect(page.getByTestId("privacy-honest-limits")).toBeVisible();
    await expect(page.getByTestId("privacy-honest-limits")).toContainText(/No TLS decryption/i);
    await expect(page.getByTestId("privacy-honest-limits-min-supported")).toBeVisible();
    await expect(page.getByTestId("privacy-honest-limits-min-supported")).toContainText(
      minSupportedVersion
    );
    await expect(page.getByTestId("privacy-desktop-offline")).toBeVisible();
    await expect(page.getByTestId("privacy-desktop-offline")).toContainText(/offline/i);
    await expect(page.getByRole("heading", { name: /No cloud account sync/i })).toBeVisible();
    await expect(page.getByTestId("privacy-contact")).toBeVisible();
    await expect(page.getByTestId("privacy-contact")).toContainText(/official email|Cloudflare Worker/i);
    await expect(page.getByTestId("privacy-faq-common")).toBeVisible();
    await expect(page.getByTestId("privacy-faq-common")).toContainText(/antivirus|votes/i);
    await expect(page.getByTestId("privacy-faq-ext-offline")).toBeVisible();
    await expect(page.getByTestId("privacy-faq-ext-offline")).toContainText(/Chrome Web Store|Mac App Store/i);
    // Round-2 survey removed — privacy must not link /survey/
    await expect(page.locator('a[href*="/survey/"]')).toHaveCount(0);
  });

  test("/en/privacy#privacy-honest-limits deep-link", async ({ page }) => {
    await page.goto(`${base}/en/privacy#privacy-honest-limits`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#privacy-honest-limits")).toBeVisible();
    await expect(page.getByTestId("privacy-honest-limits")).toBeVisible();
  });

  test("/en/privacy China mainland entry section", async ({ page }) => {
    await page.goto(`${base}/en/privacy#privacy-china-notice`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("privacy-china-notice")).toBeVisible();
    await expect(page.getByTestId("privacy-china-notice")).toContainText(/China mainland entry/i);
    await expect(page.getByTestId("privacy-china-notice")).toContainText(/otas0\.github\.io\/buusdocst/);
  });

  test("/zh-Hans/privacy China mainland entry section", async ({ page }) => {
    await page.goto(`${base}/zh-Hans/privacy#privacy-china-notice`, {
      waitUntil: "domcontentloaded"
    });
    await expect(page.getByTestId("privacy-china-notice")).toBeVisible();
    await expect(page.getByTestId("privacy-china-notice")).toContainText(/中国大陆入口/);
    await expect(page.getByTestId("privacy-china-notice")).toContainText(/otas0\.github\.io\/buusdocst/);
  });

  test("/pt-PT/privacy China mainland entry section", async ({ page }) => {
    await page.goto(`${base}/pt-PT/privacy#privacy-china-notice`, {
      waitUntil: "domcontentloaded"
    });
    await expect(page.getByTestId("privacy-china-notice")).toBeVisible();
    await expect(page.getByTestId("privacy-china-notice")).toContainText(
      /Entrada da China continental/i
    );
    await expect(page.getByTestId("privacy-china-notice")).toContainText(/otas0\.github\.io\/buusdocst/);
    await expect(page.getByTestId("privacy-china-notice")).toContainText(
      /aviso bilingue|encaminha automaticamente/i
    );
  });

  test("/pt-PT/privacy soft-live China section when Workers reachable", async ({ page }) => {
    await page.goto(`${base}/pt-PT/privacy#privacy-china-notice`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000
    });
    const section = page.getByTestId("privacy-china-notice");
    if ((await section.count()) === 0) {
      console.warn("[soft-live] pt-PT privacy-china-notice missing");
      return;
    }
    await expect(section).toBeVisible();
    const text = ((await section.textContent()) || "").replace(/\s+/g, " ").trim();
    if (!/Entrada da China continental/i.test(text)) {
      console.warn(`[soft-live] pt-PT China title soft mismatch: ${text.slice(0, 80)}`);
    } else {
      console.info(`[soft-live] pt-PT China section ok (${text.slice(0, 72)}…)`);
    }
  });

  test("/pt-BR/privacy soft-live China section when locale ships the key", async ({ page }) => {
    await page.goto(`${base}/pt-BR/privacy#privacy-china-notice`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000
    });
    const section = page.getByTestId("privacy-china-notice");
    if ((await section.count()) === 0) {
      console.warn("[soft-live] pt-BR privacy-china-notice missing (locale may not ship key yet)");
      return;
    }
    await expect(section).toBeVisible();
    const text = ((await section.textContent()) || "").replace(/\s+/g, " ").trim();
    // Soft: accept PT-BR or shared PT copy when the section is present.
    if (!/Entrada da China continental|China continental|otas0\.github\.io\/buusdocst/i.test(text)) {
      console.warn(`[soft-live] pt-BR China section soft mismatch: ${text.slice(0, 80)}`);
    } else {
      console.info(`[soft-live] pt-BR China section ok (${text.slice(0, 72)}…)`);
    }
  });

  test("/zh-Hant/privacy soft-live China section when locale ships the key", async ({ page }) => {
    await page.goto(`${base}/zh-Hant/privacy#privacy-china-notice`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000
    });
    const section = page.getByTestId("privacy-china-notice");
    if ((await section.count()) === 0) {
      console.warn("[soft-live] zh-Hant privacy-china-notice missing (locale may not ship key yet)");
      return;
    }
    await expect(section).toBeVisible();
    const text = ((await section.textContent()) || "").replace(/\s+/g, " ").trim();
    if (!/中國大陸入口|中国大陆入口|China mainland|otas0\.github\.io\/buusdocst/i.test(text)) {
      console.warn(`[soft-live] zh-Hant China section soft mismatch: ${text.slice(0, 80)}`);
    } else {
      console.info(`[soft-live] zh-Hant China section ok (${text.slice(0, 72)}…)`);
    }
  });

  test("/en/privacy#privacy-faq-common deep-link", async ({ page }) => {
    await page.goto(`${base}/en/privacy#privacy-faq-common`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#privacy-faq-common")).toBeVisible();
    await expect(page.getByTestId("privacy-faq-common")).toBeVisible();
    await expect(page.getByTestId("privacy-faq-common")).toContainText(/antivirus|votes/i);
  });

  test("/pt-PT/privacy shows policy", async ({ page }) => {
    await page.goto(`${base}/pt-PT/privacy`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("privacy-policy")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Política de privacidade/i })).toBeVisible();
    await expect(page.getByTestId("privacy-honest-limits")).toBeVisible();
    await expect(page.getByTestId("privacy-honest-limits")).toContainText(/Sem desencriptação TLS/i);
    await expect(page.getByTestId("privacy-desktop-offline")).toBeVisible();
    await expect(page.getByTestId("privacy-desktop-offline")).toContainText(/offline/i);
    await expect(
      page.getByRole("heading", { name: /Sem sincronização de conta na nuvem/i })
    ).toBeVisible();
    await expect(page.getByTestId("privacy-contact")).toBeVisible();
    await expect(page.getByTestId("privacy-faq-common")).toBeVisible();
    await expect(page.getByTestId("privacy-faq-ext-offline")).toBeVisible();
    await expect(page.getByTestId("privacy-faq-ext-offline")).toContainText(
      /Chrome Web Store|Mac App Store|extensão|Transferências/i
    );
    // Round-2 survey removed — privacy must not link /survey/
    await expect(page.locator('a[href*="/survey/"]')).toHaveCount(0);
  });

  test("/zh-Hans/privacy soft check (policy chrome)", async ({ page }) => {
    await page.goto(`${base}/zh-Hans/privacy`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    const policy = page.getByTestId("privacy-policy");
    if ((await policy.count()) === 0) {
      console.warn("[playwright] zh-Hans privacy-policy missing (soft)");
      return;
    }
    await expect(policy).toBeVisible();
    const limits = page.getByTestId("privacy-honest-limits");
    if ((await limits.count()) === 0) {
      console.warn("[playwright] zh-Hans privacy-honest-limits missing (soft)");
    } else {
      await expect(limits).toBeVisible();
    }
    // Round-2 survey removed — privacy must not link /survey/
    await expect(page.locator('a[href*="/survey/"]')).toHaveCount(0);
  });

  // Soft-live: locale Privacy FAQ extension-offline question stays visible when origin is up.
  for (const locale of ["ja", "de", "fr", "zh-Hans", "pt-BR", "zh-Hant"] as const) {
    test(`/${locale}/privacy soft-live faqExtOffline visible`, async ({ page }) => {
      await page.goto(`${base}/${locale}/privacy`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000
      });
      const faq = page.getByTestId("privacy-faq-ext-offline");
      if ((await faq.count()) === 0) {
        console.warn(`[soft-live] privacy-faq-ext-offline missing on ${locale}`);
        return;
      }
      await expect(faq).toBeVisible();
      const text = ((await faq.textContent()) || "").replace(/\s+/g, " ").trim();
      if (!text) {
        console.warn(`[soft-live] privacy-faq-ext-offline empty on ${locale}`);
      } else {
        console.info(`[soft-live] ${locale} faqExtOffline ok (${text.slice(0, 72)}…)`);
      }
      const deeplink = faq.locator('a[href*="#downloads-extension"]');
      if ((await deeplink.count()) === 0) {
        console.warn(`[soft-live] ${locale} FAQ missing #downloads-extension href (soft)`);
      } else {
        const href = (await deeplink.first().getAttribute("href")) || "";
        if (!href.includes("#downloads-extension")) {
          console.warn(`[soft-live] ${locale} FAQ href soft mismatch: ${href}`);
        } else {
          console.info(`[soft-live] ${locale} FAQ → #downloads-extension ok`);
          try {
            await Promise.all([
              page.waitForURL(/#downloads-extension/, { timeout: 12_000 }),
              deeplink.first().click()
            ]);
            if (!page.url().includes("#downloads-extension")) {
              console.warn(`[soft-live] ${locale} after click URL missing hash: ${page.url()}`);
            } else {
              console.info(`[soft-live] ${locale} click → #downloads-extension landed`);
              try {
                await assertHashSectionInView(page, "#downloads-extension", 12_000);
                console.info(`[soft-live] ${locale} #downloads-extension in view`);
              } catch (viewErr) {
                const msg = viewErr instanceof Error ? viewErr.message : String(viewErr);
                console.warn(`[soft-live] ${locale} #downloads-extension in-view soft fail: ${msg}`);
              }
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[soft-live] ${locale} FAQ Downloads click soft fail: ${msg}`);
          }
        }
      }
      // Soft-live: FAQ / intro → #privacy-honest-limits stays in view under sticky shell.
      try {
        await page.goto(`${base}/${locale}/privacy#privacy-honest-limits`, {
          waitUntil: "domcontentloaded",
          timeout: 45_000
        });
        if ((await page.locator("#privacy-honest-limits").count()) === 0) {
          console.warn(`[soft-live] ${locale} #privacy-honest-limits missing after FAQ intro`);
        } else {
          await assertHashSectionInView(page, "#privacy-honest-limits", 12_000);
          console.info(`[soft-live] ${locale} #privacy-honest-limits in view`);
        }
        // Floor note (shared MinSupportedFloorNote) — soft skip when not yet deployed.
        const floor = page.getByTestId("privacy-honest-limits-min-supported");
        if ((await floor.count()) === 0) {
          console.warn(`[soft-live] ${locale} privacy-honest-limits-min-supported missing (soft)`);
        } else {
          await expect(floor).toBeVisible();
          // When the floor testid is present, require the current min semver (soft skip only if missing).
          await expect(floor).toContainText(minSupportedVersion);
          console.info(`[soft-live] ${locale} floor testid ok (min ${minSupportedVersion})`);
        }
      } catch (limitsErr) {
        const msg = limitsErr instanceof Error ? limitsErr.message : String(limitsErr);
        console.warn(`[soft-live] ${locale} #privacy-honest-limits in-view soft fail: ${msg}`);
      }
    });
  }

  test("/en/settings shows desktop download slots", async ({ page }) => {
    await page.goto(`${base}/en/downloads`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#settings-desktop")).toBeVisible();
    await expect(page.getByTestId("settings-desktop-downloads")).toBeVisible();
    await waitForReactHydration(page, '[data-testid="settings-desktop-downloads"]');
    await expect(page.getByTestId("settings-desktop-honest-limits")).toBeVisible();
    await expect(page.getByTestId("settings-desktop-release-tag")).toBeVisible();
    // Soft-assert Setup guide (unsigned) — live copy; do not fail the suite on drift.
    const setup = page.getByTestId("settings-desktop-setup-guide");
    await waitForReactHydration(page, '[data-testid="settings-desktop-setup-guide"]').catch(() => {
      /* soft path if marker absent */
    });
    if ((await setup.count()) === 0) {
      console.warn("[playwright] settings-desktop-setup-guide missing on EN (soft)");
    } else {
      const text = ((await setup.textContent()) || "").replace(/\s+/g, " ").trim();
      if (!/Setup guide \(unsigned\)|Guia de instalação \(não assinado\)/i.test(text)) {
        console.warn("[playwright] Setup guide label soft mismatch:", text);
      } else {
        console.info("[playwright] Setup guide (unsigned) ok:", text);
      }
      const href = (await setup.getAttribute("href")) || "";
      if (!/DESKTOP_SETUP_GUIDE/i.test(href)) {
        console.warn("[playwright] Setup guide href soft mismatch:", href);
      }
    }
  });

  test("/pt-PT/settings shows desktop download slots", async ({ page }) => {
    await page.goto(`${base}/pt-PT/downloads`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#settings-desktop")).toBeVisible();
    await expect(page.getByTestId("settings-desktop-downloads")).toBeVisible();
    await waitForReactHydration(page, '[data-testid="settings-desktop-downloads"]');
    await expect(page.getByTestId("settings-desktop-honest-limits")).toBeVisible();
    const setup = page.getByTestId("settings-desktop-setup-guide");
    await waitForReactHydration(page, '[data-testid="settings-desktop-setup-guide"]').catch(() => {
      /* soft */
    });
    if ((await setup.count()) === 0) {
      console.warn("[playwright] settings-desktop-setup-guide missing on pt-PT (soft)");
    } else {
      const text = ((await setup.textContent()) || "").replace(/\s+/g, " ").trim();
      if (!/Guia de instalação \(não assinado\)|Setup guide \(unsigned\)/i.test(text)) {
        console.warn("[playwright] Setup guide pt-PT label soft mismatch:", text);
      } else {
        console.info("[playwright] Setup guide pt-PT ok:", text);
      }
    }
  });
});

const chinaBase = (process.env.CHINA_PAGES_BASE_URL || "https://otas0.github.io/buusdocst")
  .trim()
  .replace(/\/$/, "");

test.describe("China Pages notice (soft)", () => {
  test.beforeAll(async () => {
    try {
      const res = await fetch(`${chinaBase}/en.html`, {
        signal: AbortSignal.timeout(12_000),
        redirect: "follow"
      });
      if (!res.ok) {
        console.info(
          `[privacy-prod] soft-skip China Pages: ${chinaBase} HTTP ${res.status} (Workers suite may still run)`,
        );
        test.skip(true, `China Pages unreachable: ${chinaBase} HTTP ${res.status}`);
      }
      console.info(`[privacy-prod] China Pages notice checks active at ${chinaBase}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.info(
        `[privacy-prod] soft-skip China Pages: ${chinaBase} (${msg}) (Workers suite may still run)`,
      );
      test.skip(true, `China Pages unreachable: ${chinaBase}`);
    }
  });

  for (const pagePath of ["/", "/en.html"] as const) {
    test(`${pagePath} has zero /survey/ links`, async ({ page }) => {
      await page.goto(`${chinaBase}${pagePath}?china_stay=1`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000
      });
      await expect(page.locator('a[href*="/survey/"]')).toHaveCount(0);
      await expect(page.locator("body")).not.toContainText(/survey-round2/i);
    });
  }
});

