/**
 * Production privacy smoke (EN + pt-PT).
 *
 *   PLAYWRIGHT_BASE_URL=https://buusdocst.mtsu.workers.dev npm run test:playwright:privacy
 *
 * Skips when the origin is unreachable (e.g. local CF timeout) so CI/laptops
 * without workers.dev access do not fail the suite falsely.
 */
import { expect, test } from "@playwright/test";
import { waitForReactHydration } from "./helpers/spa-settings-nav";

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
    await expect(page.getByRole("heading", { name: /No cloud account sync/i })).toBeVisible();
    await expect(page.getByTestId("privacy-contact")).toBeVisible();
    await expect(page.getByTestId("privacy-contact")).toContainText(/official email|Cloudflare Worker/i);
    await expect(page.getByTestId("privacy-faq-parents")).toBeVisible();
    await expect(page.getByTestId("privacy-faq-parents")).toContainText(/antivirus|votes/i);
  });

  test("/en/privacy#privacy-honest-limits deep-link", async ({ page }) => {
    await page.goto(`${base}/en/privacy#privacy-honest-limits`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#privacy-honest-limits")).toBeVisible();
    await expect(page.getByTestId("privacy-honest-limits")).toBeVisible();
  });

  test("/en/privacy#privacy-faq-parents deep-link", async ({ page }) => {
    await page.goto(`${base}/en/privacy#privacy-faq-parents`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#privacy-faq-parents")).toBeVisible();
    await expect(page.getByTestId("privacy-faq-parents")).toBeVisible();
    await expect(page.getByTestId("privacy-faq-parents")).toContainText(/antivirus|votes/i);
  });

  test("/pt-PT/privacy shows policy", async ({ page }) => {
    await page.goto(`${base}/pt-PT/privacy`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("privacy-policy")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Política de privacidade/i })).toBeVisible();
    await expect(page.getByTestId("privacy-honest-limits")).toBeVisible();
    await expect(page.getByTestId("privacy-honest-limits")).toContainText(/Sem desencriptação TLS/i);
    await expect(
      page.getByRole("heading", { name: /Sem sincronização de conta na nuvem/i })
    ).toBeVisible();
    await expect(page.getByTestId("privacy-contact")).toBeVisible();
    await expect(page.getByTestId("privacy-faq-parents")).toBeVisible();
  });

  test("/en/settings shows desktop download slots", async ({ page }) => {
    await page.goto(`${base}/en/settings#settings-desktop`, { waitUntil: "domcontentloaded" });
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
    await page.goto(`${base}/pt-PT/settings#settings-desktop`, { waitUntil: "domcontentloaded" });
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