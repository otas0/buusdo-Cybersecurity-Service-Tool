/**
 * Shared Privacy → Settings SPA nav assertions.
 *
 * Count document `load` events only — vinext soft nav may still emit
 * `framenavigated`, which falsely fails no-reload checks.
 *
 * @see playwright/settings-honest-limits.spec.ts — Privacy Space flake note (load vs framenavigated)
 * @see shared/spa-replace-state.ts — SPA_NO_RELOAD_EVENT
 */
import { expect, type Page } from "@playwright/test";
import { SPA_NO_RELOAD_EVENT } from "../../shared/spa-replace-state";

/** Attach a document `load` counter (never `framenavigated`). */
export function trackDocumentLoads(page: Page): { readonly count: number } {
  const state = { count: 0 };
  page.on(SPA_NO_RELOAD_EVENT, () => {
    state.count += 1;
  });
  return {
    get count() {
      return state.count;
    }
  };
}

/**
 * Wait until React has hydrated `selector` (SSR markup is visible earlier).
 * Without this, nav clicks and form submit are no-ops / native GET reloads.
 */
export async function waitForReactHydration(
  page: Page,
  selector: string,
  timeoutMs = 15000
) {
  await page.waitForSelector(selector, { state: "attached", timeout: timeoutMs });
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      return Object.keys(el).some(
        (k) => k.startsWith("__reactFiber") || k.startsWith("__reactProps")
      );
    },
    selector,
    { timeout: timeoutMs }
  );
}

/** Home check form: hydrate → fill → submit (avoids empty controlled state / native reload). */
export async function submitHomeCheck(page: Page, url: string) {
  const urlInput = page.locator("#url").first();
  await waitForReactHydration(page, "#url");
  await expect(urlInput).toBeVisible({ timeout: 15000 });
  await urlInput.fill(url);
  await expect(urlInput).toHaveValue(url);
  await page.locator('button[type="submit"]').first().click();
}

/**
 * Hash section scrolled into view (Settings block-lists, desktop, …).
 * Prefer over local toBeInViewport copies in narrow/honest-limits.
 * Polls bounding rect (AppShell scrollIntoView is often rAF-deferred).
 */
export async function assertHashSectionInView(
  page: Page,
  selector: string,
  timeoutMs = 15000
) {
  const loc = page.locator(selector).first();
  await expect(loc).toBeVisible({ timeout: timeoutMs });
  const max = page.viewportSize()?.height ?? 900;
  await expect
    .poll(
      async () => loc.evaluate((el) => el.getBoundingClientRect().top),
      { timeout: timeoutMs }
    )
    .toBeLessThan(max);
  const top = await loc.evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(-80);
  // Partial visibility is enough on short mobile viewports (section taller than screen).
  await expect(loc).toBeInViewport({ ratio: 0.05, timeout: timeoutMs });
}

export async function assertSettingsDesktopInView(page: Page) {
  const max = page.viewportSize()?.height ?? 900;
  // AppShell scrolls #settings-desktop after locale/hash keep (rAF) — poll briefly.
  await expect
    .poll(
      async () =>
        page.locator("#settings-desktop").evaluate((el) => el.getBoundingClientRect().top),
      { timeout: 5000 }
    )
    .toBeLessThan(max);
  const top = await page.locator("#settings-desktop").evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(-8);
}

/** SPA replaceState paths must not bump document load count. */
export function assertSpaNavNoReload(documentLoads: number, before: number) {
  expect(documentLoads).toBe(before);
}

/** Shared tail after Privacy→Settings SPA nav (click / Enter / Space). */
export async function assertSettingsDesktopAfterSpaNav(
  page: Page,
  documentLoads: number,
  before: number,
  urlTimeoutMs = 10000
) {
  await page.waitForURL(/\/(?:en|pt-PT)\/settings#settings-desktop/, { timeout: urlTimeoutMs });
  assertSpaNavNoReload(documentLoads, before);
  await expect(page.getByTestId("settings-desktop-downloads")).toBeVisible({ timeout: 15000 });
  await assertSettingsDesktopInView(page);
}

/**
 * Locale toggle from Settings#settings-desktop must keep hash + scroll target in view
 * (EN ↔ pt-PT). Used by honest-limits + narrow — no local in-view copies.
 */
export async function assertLocaleToggleKeepsSettingsDesktop(page: Page, base: string) {
  const root = base.replace(/\/$/, "");
  await page.goto(`${root}/en/settings#settings-desktop`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("settings-desktop-downloads")).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL(/\/en\/settings#settings-desktop/);

  const lang = page.getByTestId("locale-toggle");
  await expect(lang).toBeVisible();
  await lang.click();
  await expect(page).toHaveURL(/\/pt-PT\/settings#settings-desktop/);
  await expect(page.getByTestId("settings-desktop-downloads")).toBeVisible({ timeout: 15000 });
  await assertSettingsDesktopInView(page);

  await page.getByTestId("locale-toggle").click();
  await expect(page).toHaveURL(/\/en\/settings#settings-desktop/);
  await assertSettingsDesktopInView(page);
}