/**
 * Settings → Desktop honest limits → Privacy section without a full document reload.
 * Locale toggle from Settings must keep #settings-desktop (and scroll it into view).
 * mac-source note: hidden when mirrors.macosAppZipUrl empty; visible when stubbed (CDN href).
 *
 * Flake note (Privacy Space / SPA mid-path): vinext soft nav may emit `framenavigated`.
 * Assert no-reload via document `load` count only — never `page.on("framenavigated")`.
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test playwright/settings-honest-limits.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";
import {
  clearTestDownloadsInit,
  withTestDownloads
} from "../shared/desktop-downloads-resolve";
import {
  assertLocaleToggleKeepsSettingsDesktop,
  assertSettingsDesktopAfterSpaNav,
  assertSpaNavNoReload,
  trackDocumentLoads,
  waitForReactHydration
} from "./helpers/spa-settings-nav";

const base = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

const CDN_FIXTURE = "https://cdn.example.test/PreventiveShield-macos-app.zip";
const CDN_ESC = CDN_FIXTURE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Localized settings-desktop-mac-cdn-desc = desktopDownloadMacSource with CDN + href. */
const MAC_CDN_DESC_EN = new RegExp(`^macOS source: CDN mirror — ${CDN_ESC}$`);
const MAC_CDN_DESC_PT = new RegExp(`^Origem macOS: Espelho CDN — ${CDN_ESC}$`);

async function baseReachable(): Promise<boolean> {
  try {
    const res = await fetch(base, { signal: AbortSignal.timeout(4000) });
    return res.status > 0;
  } catch {
    return false;
  }
}

async function installDownloadsStub(page: Page, stub: ReturnType<typeof withTestDownloads>) {
  await page.addInitScript((downloads) => {
    (
      window as Window & {
        __SHIELD_TEST_DESKTOP_DOWNLOADS__?: typeof downloads;
      }
    ).__SHIELD_TEST_DESKTOP_DOWNLOADS__ = downloads;
  }, stub);
}

/** Section aria-labelledby resolves to #settings-desktop-heading text (downloads row under it). */
async function assertDownloadsRowLabelledByHeading(page: Page) {
  const section = page.getByTestId("settings-desktop-downloads");
  await expect(section).toHaveAttribute("aria-labelledby", "settings-desktop-heading");
  const row = page.getByTestId("settings-desktop-download-row");
  await expect(row).toBeVisible();
  // Regression: row must not duplicate section labelledby (double SR heading).
  await expect(row).not.toHaveAttribute("aria-labelledby");
  // Exactly one settings-desktop-heading in the DOM (unique for SR).
  await expect(page.locator("#settings-desktop-heading")).toHaveCount(1);
  const headingText = (await page.locator("#settings-desktop-heading").textContent())?.trim() ?? "";
  expect(headingText.length).toBeGreaterThan(0);
  const labelledBy = await section.getAttribute("aria-labelledby");
  expect(labelledBy).toBe("settings-desktop-heading");
  const resolved = (await page.locator(`#${labelledBy}`).textContent())?.trim() ?? "";
  expect(resolved).toBe(headingText);
}

/** mac-source title must equal mac-cdn-desc textContent (both locales). */
async function assertMacSourceTitleEqualsCdnDesc(page: Page, localePattern: RegExp) {
  const desc = page.getByTestId("settings-desktop-mac-cdn-desc");
  await expect(desc).toHaveText(localePattern);
  const text = (await desc.textContent())?.trim() ?? "";
  expect(text.length).toBeGreaterThan(0);
  await expect(page.getByTestId("settings-desktop-mac-source")).toHaveAttribute("title", text);
  await expect(page.getByTestId("settings-desktop-mac-cdn-desc")).toHaveText(text);

  // Visually hidden but still in the accessibility tree (aria-describedby target).
  await expect(desc).toHaveClass(/visually-hidden/);
  const hiddenStyle = await desc.evaluate((el) => {
    const s = getComputedStyle(el);
    return { position: s.position, clip: s.clip, width: s.width, height: s.height };
  });
  expect(hiddenStyle.position).toBe("absolute");
  expect(hiddenStyle.width).toBe("1px");
  expect(hiddenStyle.height).toBe("1px");
  await expect(desc).toBeAttached();

  const mac = page.getByTestId("settings-desktop-download-mac");
  await expect(mac).toHaveAttribute("aria-describedby", "settings-desktop-mac-cdn-desc");
  // describedby resolves to the same node (still in a11y tree for SR).
  const describedId = await mac.getAttribute("aria-describedby");
  expect(describedId).toBe("settings-desktop-mac-cdn-desc");
  await expect(page.locator(`#${describedId}`)).toHaveText(text);
  // a11y: describedby alone — no aria-description (avoids double-announce).
  await expect(mac).not.toHaveAttribute("aria-description");
  // Hard-fail if mac <a> gains a redundant title again.
  await expect(mac).not.toHaveAttribute("title");

  // Sole aria-describedby target id in Settings desktop section.
  await expect(page.locator("#settings-desktop-mac-cdn-desc")).toHaveCount(1);
  const describedByIds = await page.locator("#settings-desktop [aria-describedby]").evaluateAll((els) =>
    els.map((el) => el.getAttribute("aria-describedby") || "")
  );
  for (const id of describedByIds) {
    expect(id).toBe("settings-desktop-mac-cdn-desc");
  }
}

test.describe("Settings → honest limits (SPA)", () => {
  test("opens privacy honest-limits without full reload", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }

    // Count document loads (not framenavigated — vinext soft nav can still emit those).
    const loads = trackDocumentLoads(page);

    await page.goto(`${base}/en/settings#settings-desktop`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("settings-desktop-downloads")).toBeVisible({ timeout: 15000 });
    await waitForReactHydration(page, '[data-testid="settings-desktop-honest-limits"]');
    await assertDownloadsRowLabelledByHeading(page);
    const afterGoto = loads.count;

    const link = page.getByTestId("settings-desktop-honest-limits");
    await expect(link).toBeVisible();
    await link.click();

    await expect(page.getByTestId("privacy-policy")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("#privacy-honest-limits")).toBeVisible();
    await expect(page.getByTestId("privacy-honest-limits")).toBeVisible();
    await expect(page).toHaveURL(/\/en\/privacy#privacy-honest-limits/);

    assertSpaNavNoReload(loads.count, afterGoto);
  });

  test("locale toggle from Settings keeps #settings-desktop", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }

    await assertLocaleToggleKeepsSettingsDesktop(page, base);
  });

  test("mac-source hidden when mirror empty", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }

    await page.addInitScript(clearTestDownloadsInit);
    await page.goto(`${base}/en/settings#settings-desktop`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("settings-desktop-downloads")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("settings-desktop-mac-source")).toHaveCount(0);
  });

  test("mac-source visible when mirror stubbed via fixture (CDN href)", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }

    const RELEASE_NOTES_STUB = "https://cdn.example.test/RELEASE-notes.md";
    const stub = withTestDownloads({
      mirrors: { macosAppZipUrl: CDN_FIXTURE },
      releaseNotesUrl: RELEASE_NOTES_STUB
    });
    await installDownloadsStub(page, stub);

    const loads = trackDocumentLoads(page);

    await page.goto(`${base}/en/settings#settings-desktop`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("settings-desktop-downloads")).toBeVisible({ timeout: 15000 });
    await assertDownloadsRowLabelledByHeading(page);
    await expect(page.getByTestId("settings-desktop-mac-source")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("settings-desktop-mac-source")).toContainText(/CDN|Espelho|GitHub/i);
    await assertMacSourceTitleEqualsCdnDesc(page, MAC_CDN_DESC_EN);

    const mac = page.getByTestId("settings-desktop-download-mac");
    await expect(mac).toHaveAttribute("href", CDN_FIXTURE);
    await expect(mac).toHaveAttribute("aria-describedby", "settings-desktop-mac-cdn-desc");
    await expect(page.getByTestId("settings-desktop-mac-cdn-desc")).toHaveText(MAC_CDN_DESC_EN);
    await expect(page.locator("#settings-desktop-mac-cdn-desc")).toHaveText(MAC_CDN_DESC_EN);

    // pt-PT: localized mac-cdn-desc + mac-source title via same helper.
    await page.goto(`${base}/pt-PT/settings#settings-desktop`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("settings-desktop-downloads")).toBeVisible({ timeout: 15000 });
    await assertDownloadsRowLabelledByHeading(page);
    await assertMacSourceTitleEqualsCdnDesc(page, MAC_CDN_DESC_PT);

    // Back to EN for Privacy SPA path below.
    await page.goto(`${base}/en/settings#settings-desktop`, { waitUntil: "domcontentloaded" });
    await assertMacSourceTitleEqualsCdnDesc(page, MAC_CDN_DESC_EN);

    await page.goto(`${base}/en/privacy#privacy-honest-limits`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("privacy-honest-limits")).toBeVisible({ timeout: 15000 });
    // Privacy release-notes href comes from resolveDesktopDownloads() (stubbed).
    await expect(page.getByTestId("privacy-desktop-release-notes")).toHaveAttribute(
      "href",
      RELEASE_NOTES_STUB
    );
    const noteEn = page.getByTestId("privacy-desktop-mirror-note");
    await expect(noteEn).toBeVisible({ timeout: 15000 });
    await waitForReactHydration(page, '[data-testid="privacy-desktop-mirror-note"]');
    await expect(noteEn).toHaveAttribute("href", /\/en\/settings#settings-desktop/);

    const beforeNoteClick = loads.count;
    await noteEn.click();
    await assertSettingsDesktopAfterSpaNav(page, loads.count, beforeNoteClick);
    // Stub must survive Privacy → Settings navigation (initScript / SPA).
    await expect(page.getByTestId("settings-desktop-download-mac")).toHaveAttribute("href", CDN_FIXTURE);

    // Active locale: pt-PT Privacy mirror note → SPA stays under /pt-PT/settings#settings-desktop.
    await page.goto(`${base}/pt-PT/privacy#privacy-honest-limits`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("privacy-honest-limits")).toBeVisible({ timeout: 15000 });
    const notePt = page.getByTestId("privacy-desktop-mirror-note");
    await expect(notePt).toBeVisible({ timeout: 15000 });
    await expect(notePt).toHaveAttribute("href", /\/pt-PT\/settings#settings-desktop/);

    // Keyboard Enter must take the same SPA path as click.
    const beforePtEnter = loads.count;
    await notePt.focus();
    await page.keyboard.press("Enter");
    await assertSettingsDesktopAfterSpaNav(page, loads.count, beforePtEnter);

    // Space on the mirror note — same SPA path as Enter/click; catch default Space scroll mid-keydown.
    await page.goto(`${base}/en/privacy#privacy-honest-limits`, { waitUntil: "domcontentloaded" });
    const noteEnSpace = page.getByTestId("privacy-desktop-mirror-note");
    await expect(noteEnSpace).toBeVisible({ timeout: 15000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    const scrollBeforeSpace = await page.evaluate(() => window.scrollY);
    const beforeSpace = loads.count;
    await noteEnSpace.focus();

    // Capture scrollY on the privacy page in the same turn as Space (before SPA navigation settles).
    const midKeyScroll = page.evaluate(() => {
      return new Promise<{ scrollY: number; path: string }>((resolve) => {
        const handler = (e: KeyboardEvent) => {
          if (e.key !== " " && e.code !== "Space") return;
          // After React/preventDefault handlers; before navigation paints away.
          setTimeout(() => {
            resolve({ scrollY: window.scrollY, path: location.pathname });
            window.removeEventListener("keydown", handler, true);
          }, 0);
        };
        window.addEventListener("keydown", handler, true);
      });
    });

    const [mid] = await Promise.all([midKeyScroll, page.keyboard.press(" ")]);
    expect(mid.path).toMatch(/privacy|settings/);
    if (mid.path.includes("privacy")) {
      // Still on privacy mid-keydown: default Space scroll must not have moved the page.
      expect(mid.scrollY).toBe(scrollBeforeSpace);
    }
    // Mid-path settings or privacy→settings: one shared waitForURL + no-reload + in-view tail.
    await assertSettingsDesktopAfterSpaNav(
      page,
      loads.count,
      beforeSpace,
      mid.path.includes("settings") ? 5000 : 10000
    );
  });
});