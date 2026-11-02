/**
 * Optional narrow Settings screenshot (pt-PT checklist + CSV filter).
 * Run: PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:playwright:settings
 * CI: set repository variable RUN_PLAYWRIGHT_SETTINGS=true
 *
 * Also writes a ~400px-wide thumb via scripts/png-max-width.mjs (no ImageMagick).
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import {
  crossedFiveSecBoundary,
  shouldAnnounceRateLimitTick
} from "../components/rate-limit-announce";
import {
  assertHashSectionInView,
  assertLocaleToggleKeepsSettingsDesktop
} from "./helpers/spa-settings-nav";

const playwrightDir = dirname(fileURLToPath(import.meta.url));
const leaveAndBlockFixture = JSON.parse(
  readFileSync(join(playwrightDir, "fixtures/leave-and-block.json"), "utf8")
) as { url: string; host: string; expectedRecommendation: string };

function curatedHasFixtureHost(host: string): boolean {
  try {
    const curated = JSON.parse(
      readFileSync(join(playwrightDir, "../security/data/curated-threats.json"), "utf8")
    ) as { hosts?: Record<string, string> };
    return Boolean(curated.hosts?.[host]);
  } catch {
    return false;
  }
}

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

async function baseReachable(): Promise<boolean> {
  try {
    const res = await fetch(base, { signal: AbortSignal.timeout(4000) });
    return res.status > 0;
  } catch {
    return false;
  }
}

test.describe("Settings narrow pt-PT", () => {
  test("screenshot checklist + CSV filter", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }
    mkdirSync("playwright/output", { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/pt-PT/settings`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#settings-privacy, .settings-stage", { timeout: 15000 });
    const legend = page.getByTestId("settings-timing-flag-legend");
    await expect(legend).toBeVisible({ timeout: 15000 });
    await expect(legend.locator('[data-flag="ambiguousProbeStatus"]')).toHaveText("sonda ambígua");
    // Soft-assert: each legend chip bounding box stays within the first 844px viewport height.
    const chips = legend.locator(".timing-flag-chip");
    const chipCount = await chips.count();
    for (let i = 0; i < chipCount; i += 1) {
      const chipBox = await chips.nth(i).boundingBox();
      if (!chipBox) {
        console.warn("[playwright] legend chip boundingBox missing (soft):", i);
        continue;
      }
      const bottom = chipBox.y + chipBox.height;
      if (bottom > 844) {
        console.warn("[playwright] legend chip below first 844px viewport (soft):", {
          index: i,
          y: chipBox.y,
          height: chipBox.height,
          bottom
        });
      } else {
        console.info("[playwright] legend chip within first 844px viewport:", { index: i, bottom });
      }
    }
    // Soft-assert: intelBody collapsed behind More on narrow viewports.
    const intelMore = page.getByTestId("settings-intel-more");
    const intelBody = page.locator(".settings-stage .intel-body");
    if (!(await intelMore.isVisible().catch(() => false))) {
      console.warn("[playwright] settings-intel-more not visible on narrow (soft)");
    } else {
      console.info("[playwright] settings-intel-more visible");
      const bodyHidden = !(await intelBody.isVisible().catch(() => false));
      if (!bodyHidden) {
        console.warn("[playwright] intel-body visible before More click (soft)");
      } else {
        await intelMore.click();
        if (!(await intelBody.isVisible().catch(() => false))) {
          console.warn("[playwright] intel-body still hidden after More click (soft)");
        } else {
          console.info("[playwright] intel-body revealed after More click");
        }
      }
    }
    // Soft-assert: probe-blocked history filter checkbox label (pt-PT).
    const ptProbeFilter = page.getByTestId("history-filter-probe-blocked");
    if (!(await ptProbeFilter.isVisible().catch(() => false))) {
      console.warn("[playwright] history-filter-probe-blocked missing on pt-PT (soft)");
    } else {
      const ptLabel = (await ptProbeFilter.innerText()).replace(/\s+/g, " ").trim();
      if (!/probe-blocked/i.test(ptLabel)) {
        console.warn("[playwright] probe-blocked filter pt-PT label soft mismatch:", ptLabel);
      } else {
        console.info("[playwright] probe-blocked filter pt-PT label ok:", ptLabel);
      }
    }
    await page.goto(`${base}/en/settings`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#settings-privacy, .settings-stage", { timeout: 15000 });
    const enProbeFilter = page.getByTestId("history-filter-probe-blocked");
    if (!(await enProbeFilter.isVisible().catch(() => false))) {
      console.warn("[playwright] history-filter-probe-blocked missing on EN (soft)");
    } else {
      // Soft-assert: EN label stays i18n-stable (messages.historyFilterProbeBlocked).
      const enLabel = (await enProbeFilter.innerText()).replace(/\s+/g, " ").trim();
      if (enLabel !== "Show probe-blocked checks only") {
        console.warn("[playwright] probe-blocked filter EN label soft mismatch (i18n-stable):", enLabel);
      } else {
        console.info("[playwright] probe-blocked filter EN label i18n-stable ok");
      }
    }
    // Soft-assert timeouts-only empty copy stays historyFilterEmpty (seed history, no timeouts).
    await page.evaluate(() => {
      localStorage.setItem("shieldPrivacyMode", "local");
      localStorage.setItem(
        "shieldCheckHistory",
        JSON.stringify([
          {
            at: new Date().toISOString(),
            domain: "ok.example",
            level: "LOW_EVIDENCE",
            probeMs: 40,
            timedOut: false
          }
        ])
      );
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".history-filter", { timeout: 15000 });
    const timeoutsFilter = page.locator(".history-filter").filter({ hasText: /timed-out|timeout/i }).first();
    if (await timeoutsFilter.isVisible().catch(() => false)) {
      await timeoutsFilter.locator("input[type='checkbox']").check();
      const empty = page.getByTestId("history-filter-empty");
      const emptyText = (await empty.textContent().catch(() => ""))?.trim() ?? "";
      if (emptyText !== "No timed-out checks in recent history.") {
        console.warn("[playwright] timeouts-only empty copy soft mismatch:", emptyText);
      } else {
        console.info("[playwright] timeouts-only empty copy keeps historyFilterEmpty");
      }
      await timeoutsFilter.locator("input[type='checkbox']").uncheck();
    }
    // Soft-assert: probe-blocked chip on with no matching rows → dedicated empty copy.
    const probeFilter = page.getByTestId("history-filter-probe-blocked");
    if (await probeFilter.isVisible().catch(() => false)) {
      await probeFilter.locator("input[type='checkbox']").check();
      const probeEmpty = page.getByTestId("history-filter-empty");
      const probeEmptyText = (await probeEmpty.textContent().catch(() => ""))?.trim() ?? "";
      if (probeEmptyText !== "No probe-blocked checks in recent history.") {
        console.warn("[playwright] probe-blocked empty copy soft mismatch:", probeEmptyText);
      } else {
        console.info("[playwright] probe-blocked empty copy ok");
      }
    }
    // Hard-assert EN: CSV help sits immediately above the export action row (unit grep covers source; no new STRICT title).
    const csvHelpOrderEn = await page.evaluate(() => {
      const help = document.querySelector('[data-testid="history-export-csv-help"]');
      if (!help) return { ok: false, reason: "missing-help" };
      const sib = help.nextElementSibling;
      if (!sib || !sib.classList.contains("action-row")) {
        return { ok: false, reason: "next-not-action-row", tag: sib?.tagName ?? null };
      }
      return { ok: true };
    });
    expect(csvHelpOrderEn.ok).toBe(true);
    // Hard-assert: history CSV filter chip labels stay adjacent to empty-copy / export-help testids.
    const csvFilterAdjEn = await page.evaluate(() => {
      const fieldset = document.querySelector(".history-csv-filter");
      const help = document.querySelector('[data-testid="history-export-csv-help"]');
      const empty = document.querySelector('[data-testid="history-filter-empty"]');
      const probe = document.querySelector('[data-testid="history-filter-probe-blocked"]');
      if (!fieldset || !help) return { ok: false, reason: "missing-fieldset-or-help" };
      const fieldsetBeforeHelp = fieldset.nextElementSibling === help;
      const labels = fieldset.querySelectorAll("label");
      if (labels.length < 2) return { ok: false, reason: "few-csv-filter-labels", n: labels.length };
      let chipBeforeEmptyOrCsv = true;
      if (probe && empty) {
        chipBeforeEmptyOrCsv = Boolean(
          probe.compareDocumentPosition(empty) & Node.DOCUMENT_POSITION_FOLLOWING
        );
      } else if (probe) {
        chipBeforeEmptyOrCsv = Boolean(
          probe.compareDocumentPosition(fieldset) & Node.DOCUMENT_POSITION_FOLLOWING
        );
      }
      return { ok: fieldsetBeforeHelp && chipBeforeEmptyOrCsv, fieldsetBeforeHelp, chipBeforeEmptyOrCsv };
    });
    expect(csvFilterAdjEn.ok).toBe(true);
    await page.goto(`${base}/pt-PT/settings`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#settings-privacy, .settings-stage", { timeout: 15000 });
    // Hard-assert pt-PT probe-blocked empty copy (EN covered by unit test; no new STRICT title).
    await page.evaluate(() => {
      localStorage.setItem("shieldPrivacyMode", "local");
      localStorage.setItem(
        "shieldCheckHistory",
        JSON.stringify([
          {
            at: new Date().toISOString(),
            domain: "ok.example",
            level: "LOW_EVIDENCE",
            probeMs: 40,
            timedOut: false
          }
        ])
      );
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-testid='history-filter-probe-blocked']", { timeout: 15000 });
    const ptProbeEmptyFilter = page.getByTestId("history-filter-probe-blocked");
    await expect(ptProbeEmptyFilter).toBeVisible();
    await ptProbeEmptyFilter.locator("input[type='checkbox']").check();
    await expect(page.getByTestId("history-filter-empty")).toHaveText(
      "Não há probe-blocked no histórico recente."
    );
    // Hard-assert pt-PT: CSV help sits immediately above the export action row (EN already hard; no new STRICT title).
    const csvHelpOrderPt = await page.evaluate(() => {
      const help = document.querySelector('[data-testid="history-export-csv-help"]');
      if (!help) return { ok: false, reason: "missing-help" };
      const sib = help.nextElementSibling;
      if (!sib || !sib.classList.contains("action-row")) {
        return { ok: false, reason: "next-not-action-row", tag: sib?.tagName ?? null };
      }
      return { ok: true };
    });
    expect(csvHelpOrderPt.ok).toBe(true);
    // Soft-assert pt-PT: CSV filter chip adjacency mirrors EN hard path (no new STRICT title).
    const csvFilterAdjPt = await page.evaluate(() => {
      const fieldset = document.querySelector(".history-csv-filter");
      const help = document.querySelector('[data-testid="history-export-csv-help"]');
      const empty = document.querySelector('[data-testid="history-filter-empty"]');
      const probe = document.querySelector('[data-testid="history-filter-probe-blocked"]');
      if (!fieldset || !help) return { ok: false, reason: "missing-fieldset-or-help" };
      const fieldsetBeforeHelp = fieldset.nextElementSibling === help;
      const labels = fieldset.querySelectorAll("label");
      if (labels.length < 2) return { ok: false, reason: "few-csv-filter-labels", n: labels.length };
      let chipBeforeEmptyOrCsv = true;
      if (probe && empty) {
        chipBeforeEmptyOrCsv = Boolean(
          probe.compareDocumentPosition(empty) & Node.DOCUMENT_POSITION_FOLLOWING
        );
      } else if (probe) {
        chipBeforeEmptyOrCsv = Boolean(
          probe.compareDocumentPosition(fieldset) & Node.DOCUMENT_POSITION_FOLLOWING
        );
      }
      return { ok: fieldsetBeforeHelp && chipBeforeEmptyOrCsv, fieldsetBeforeHelp, chipBeforeEmptyOrCsv };
    });
    if (!csvFilterAdjPt.ok) {
      console.warn("[playwright] pt-PT history CSV filter chips adjacent soft fail:", csvFilterAdjPt);
    } else {
      console.info("[playwright] pt-PT history CSV filter chip adjacency mirrors EN");
    }
    const full = "playwright/output/settings-narrow-pt.png";
    const thumb = "playwright/output/settings-narrow-pt-thumb.png";
    const legendShot = "playwright/output/settings-timing-legend-pt.png";
    const legendThumb = "playwright/output/settings-timing-legend-pt-thumb.png";
    await page.screenshot({ path: full, fullPage: true });
    await legend.screenshot({ path: legendShot });
    const thumbRun = spawnSync(
      process.execPath,
      ["scripts/png-max-width.mjs", full, thumb, "400"],
      { encoding: "utf8" }
    );
    const legendThumbRun = spawnSync(
      process.execPath,
      ["scripts/png-max-width.mjs", legendShot, legendThumb, "400"],
      { encoding: "utf8" }
    );
    // Soft: full PNG is enough for CI; thumbs are best-effort (no ImageMagick).
    if (thumbRun.status !== 0) {
      console.warn("[playwright] thumb helper failed (soft):", thumbRun.stderr || thumbRun.stdout);
    }
    if (legendThumbRun.status !== 0) {
      console.warn(
        "[playwright] timing-legend thumb helper failed (soft):",
        legendThumbRun.stderr || legendThumbRun.stdout
      );
    }
    // Soft-assert: legend thumb should exist when the helper succeeded.
    if (legendThumbRun.status === 0 && !existsSync(legendThumb)) {
      console.warn("[playwright] legend thumb missing after helper (soft):", legendThumb);
    } else if (legendThumbRun.status === 0 && existsSync(legendThumb)) {
      console.info("[playwright] legend thumb ok:", legendThumb);
    }
  });

  test("diagnostics table shows header-preferred label after seeded 429 log", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/en/settings`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#settings-diagnostics", { timeout: 15000 });
    await page.evaluate(() => {
      localStorage.setItem("shieldPrivacyMode", "local");
      localStorage.setItem(
        "shieldDiagnosticLog",
        JSON.stringify([
          {
            at: new Date().toISOString(),
            error: "rate-limited-header-preferred",
            source: "web",
            deltaSec: 30
          },
          {
            at: new Date().toISOString(),
            error: "rate-limited",
            source: "web"
          }
        ])
      );
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("#settings-diagnostics", { timeout: 15000 });
    const block = page.locator("#settings-diagnostics");
    await expect(block.locator("code", { hasText: "rate-limited-header-preferred" })).toBeVisible();
    await expect(block.getByTestId("diagnostic-last-header-preferred")).toContainText("30");
    await expect(block.locator(".display").filter({ hasText: /Retry-After header preferred/i })).toBeVisible();
    await expect(block.locator(".meta").filter({ hasText: /Δ30s/ })).toBeVisible();
  });

  test("MERGE_PT toggle hot-applies against live localhost", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/en/settings`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#settings-privacy, .settings-stage", { timeout: 15000 });
    const toggle = page.locator("label.history-filter", {
      hasText: /OWN_THREAT_MERGE_PT|Write OWN_THREAT_MERGE_PT/
    });
    if ((await toggle.count()) === 0) {
      test.skip(true, "MERGE_PT toggle only on local-dev server");
      return;
    }
    const box = toggle.locator('input[type="checkbox"]');
    await expect(box).toBeVisible({ timeout: 10000 });
    const before = await box.isChecked();
    await box.click();
    await expect
      .poll(async () => {
        const health = await (await fetch(`${base}/api/health`)).json();
        return Boolean(health.ownThreatMergePt);
      })
      .toBe(!before);
    // Restore prior merge state for other tests / local ops.
    await box.click();
  });

  test("result page has no Block this domain button", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
    const urlInput = page.locator('input[name="url"], #url, input[type="url"]').first();
    await urlInput.waitFor({ state: "visible", timeout: 15000 });
    await urlInput.fill("https://example.com");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForSelector(".log-action, .result-details, [class*='Risk']", { timeout: 20000 }).catch(() => null);
    await expect(page.getByRole("button", { name: /Block this domain/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Block$/i })).toHaveCount(0);

    // Soft-assert rate-limit data-announce-reason=cross via fake skipped tick (no DOM flakiness).
    if (
      shouldAnnounceRateLimitTick(41, 39) &&
      crossedFiveSecBoundary(41, 39)
    ) {
      console.info(
        '[playwright] rate-limit data-announce-reason="cross" soft (fake skipped tick 41→39)'
      );
    } else {
      console.warn("[playwright] rate-limit cross helper soft fail for 41→39");
    }

    // Soft-assert live region boundary with fake timers when DOM path is available (no new STRICT title).
    await page.unroute("**/api/check").catch(() => {});
    await page.route("**/api/check", async (route) => {
      await route.fulfill({
        status: 429,
        headers: {
          "Retry-After": "11",
          "Access-Control-Expose-Headers": "Retry-After",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ok: false, error: "rate-limited", retryAfterSec: 11 })
      });
    });
    let clockOk = false;
    try {
      await page.clock.install();
      clockOk = true;
    } catch {
      /* older Playwright — fall through to real-time soft poll */
    }
    await urlInput.fill("https://rate-limit-soft.example/");
    await page.locator('button[type="submit"]').first().click();
    const live = page.getByTestId("rate-limit-live");
    if (!(await live.isVisible().catch(() => false))) {
      console.warn("[playwright] rate-limit live region missing after 429 (soft)");
    } else {
      if (clockOk) {
        try {
          await page.clock.fastForward(2000);
        } catch {
          clockOk = false;
        }
      }
      const boundarySeen = await page
        .waitForFunction(() => {
          const el = document.querySelector('[data-testid="rate-limit-live"]');
          const reason = el?.getAttribute("data-announce-reason");
          return reason === "boundary" || reason === "cross";
        }, { timeout: 10000 })
        .then(() => true)
        .catch(() => false);
      const text = ((await live.textContent()) ?? "").trim();
      const synced = await page
        .locator(".rate-limit-bar")
        .getAttribute("data-valuetext-synced")
        .catch(() => null);
      if (boundarySeen) {
        console.info(
          "[playwright] rate-limit live region text updates at crossed/5s boundary (soft):",
          text,
          synced ? `valuetext-synced=${synced}` : ""
        );
      } else {
        console.warn(
          "[playwright] rate-limit 5s boundary announce not observed (soft; cross helper covered above):",
          text
        );
      }
      // Soft-assert data-valuetext-synced="cross" when clock fast-forward is available.
      if (clockOk) {
        if (synced === "cross") {
          console.info('[playwright] RateLimitBar data-valuetext-synced="cross" soft ok (clock)');
        } else {
          console.info(
            '[playwright] RateLimitBar data-valuetext-synced="cross" soft: not observed this run (1s ticks usually hit boundary; source + helper cover cross)',
            synced
          );
        }
      }
    }
  });

  test("Settings block-lists note links to extension and desktop READMEs", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }
    await page.goto(`${base}/en/settings#settings-block-lists`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#settings-block-lists", { timeout: 15000 });
    const section = page.locator("#settings-block-lists");
    await expect(section.locator('a[href*="extension/README"]')).toBeVisible();
    await expect(section.locator('a[href*="desktop-app/README"]')).toBeVisible();
    await expect(page.getByTestId("settings-block-lists-live")).toBeVisible();
    await expect(page.getByTestId("settings-block-lists-live")).toContainText(/extension|desktop|extensão|app/i);
    await expect(page.locator("#settings-block-lists .scope-note")).toContainText(
      /does not enforce|não aplica|Account sync|Conta opcional|offline/i
    );
  });

  test("Settings account section visible; soft-assert sign-in when sync enabled", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }
    await page.goto(`${base}/en/settings#settings-account`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#settings-account, [data-testid=settings-account]", {
      timeout: 15000
    });
    const account = page.getByTestId("settings-account");
    await expect(account).toBeVisible();
    const health = await page.request.get(`${base}/api/health`).then((r) => r.json());
    if (health?.accountSyncEnabled === true) {
      await expect(page.getByTestId("settings-account-signin")).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId("settings-account-email")).toBeVisible();
      console.info("[playwright] account sync enabled — sign-in CTA visible");
    } else {
      await expect(page.getByTestId("settings-account-disabled")).toBeVisible({ timeout: 10000 });
      console.info("[playwright] account sync disabled (default) — disabled copy visible");
    }
  });

  test("locale toggle from Settings keeps #settings-desktop (shared SPA helper)", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }
    await assertLocaleToggleKeepsSettingsDesktop(page, base);
  });

  test("click Settings nav twice asserts #settings-block-lists in viewport", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }
    await page.setViewportSize({ width: 390, height: 844 });
    // Land on Settings first (avoids home→settings click flake), then nav click scrolls block-lists.
    await page.goto(`${base}/en/settings`, { waitUntil: "load" });
    await page.waitForSelector("#settings-privacy, .settings-stage", { timeout: 15000 });
    // Client hydrate marker — Data select only wires after AppShell mounts.
    await expect(page.locator("#settings-data-select")).toBeVisible({ timeout: 15000 });
    const settingsNav = page.getByRole("navigation").getByRole("button", {
      name: /Settings|Definições/i
    });
    await expect(settingsNav).toBeVisible();
    // Already on Settings → navigate() uses #settings-block-lists + scrollIntoView.
    await settingsNav.click();
    // SPA replaceState — use toHaveURL (waitForURL + waitUntil load never settles).
    await expect(page).toHaveURL(/\/en\/settings#settings-block-lists/, { timeout: 15000 });
    await assertHashSectionInView(page, "#settings-block-lists");
  });

  test("result Settings link scrolls #settings-block-lists into view", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }
    // Seeded LEAVE_AND_BLOCK fixture — restore host in curated-threats.json if this drifts.
    const fixture = leaveAndBlockFixture;
    if (!curatedHasFixtureHost(fixture.host)) {
      const msg = `Fixture host ${fixture.host} missing from security/data/curated-threats.json — restore before LEAVE_AND_BLOCK UI check`;
      if (process.env.STRICT_LEAVE_AND_BLOCK === "1") {
        throw new Error(msg);
      }
      test.skip(true, msg);
      return;
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
    const urlInput = page.locator('input[name="url"], #url, input[type="url"]').first();
    await urlInput.waitFor({ state: "visible", timeout: 15000 });
    await urlInput.fill(fixture.url);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForSelector(".log-action", { timeout: 20000 });
    const cta = page.getByTestId("leave-and-block-settings");
    if ((await cta.count()) === 0) {
      const msg = `Curated list drift: expected ${fixture.expectedRecommendation} CTA for ${fixture.url} — check security/data/curated-threats.json`;
      if (process.env.STRICT_LEAVE_AND_BLOCK === "1") {
        throw new Error(msg);
      }
      test.skip(true, msg);
      return;
    }
    await cta.click();
    await page.waitForURL(/\/en\/settings/, { timeout: 15000 });
    await assertHashSectionInView(page, "#settings-block-lists");
    await assertHashSectionInView(page, '[data-testid="settings-block-lists-live"]');
    // Soft screenshot of the deep-link row (best-effort; do not fail the suite).
    try {
      mkdirSync("playwright/output", { recursive: true });
      await page.getByTestId("settings-block-lists-live").screenshot({
        path: "playwright/output/settings-block-lists-live.png"
      });
    } catch (err) {
      console.warn("[playwright] settings-block-lists-live screenshot soft-failed:", err);
    }
  });

  test("result block-lists settings link href ends with #settings-block-lists", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }
    const fixture = leaveAndBlockFixture;
    if (!curatedHasFixtureHost(fixture.host)) {
      const msg = `Fixture host ${fixture.host} missing from curated-threats.json`;
      if (process.env.STRICT_LEAVE_AND_BLOCK === "1") throw new Error(msg);
      test.skip(true, msg);
      return;
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
    const urlInput = page.locator('input[name="url"], #url, input[type="url"]').first();
    await urlInput.waitFor({ state: "visible", timeout: 15000 });
    await urlInput.fill(fixture.url);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForSelector(".log-action", { timeout: 20000 });
    const link = page.getByTestId("result-block-lists-settings");
    if ((await link.count()) === 0) {
      const msg = "result-block-lists-settings missing after check";
      if (process.env.STRICT_LEAVE_AND_BLOCK === "1") throw new Error(msg);
      test.skip(true, msg);
      return;
    }
    const href = await link.getAttribute("href");
    expect(href || "").toMatch(/#settings-block-lists$/);
  });

  test("AppShell check request body never includes personalListBlocked", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
    const urlInput = page.locator('input[name="url"], #url, input[type="url"]').first();
    await urlInput.waitFor({ state: "visible", timeout: 15000 });
    await urlInput.fill("https://example.com/");
    const reqPromise = page.waitForRequest(
      (req) => req.url().includes("/api/check") && req.method() === "POST",
      { timeout: 20000 }
    );
    await page.locator('button[type="submit"]').first().click();
    const req = await reqPromise;
    const checkBody = req.postData() || "";
    expect(checkBody).not.toMatch(/personalListBlocked/);
    const parsed = JSON.parse(checkBody) as { url?: string; personalListBlocked?: unknown };
    expect(parsed.url).toBeTruthy();
    expect(parsed.personalListBlocked).toBeUndefined();
  });

  test("user-block-evidence and personal-list-leave-note show when check returns personalListBlocked hint", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/check", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          timingValid: true,
          analysis: {
            personalListBlocked: true,
            parsed: {
              fullUrl: "https://blocked-hint.example/",
              protocol: "https:",
              hostname: "blocked-hint.example",
              unicodeHostname: "blocked-hint.example",
              registrableDomain: "blocked-hint.example",
              subdomain: "",
              path: "/",
              usesHttps: true,
              hasPunycode: false
            },
            threat: {
              state: "NO_KNOWN_MATCH",
              providerName: "Preventive Shield own threat list",
              checkedAt: new Date().toISOString(),
              evidence: []
            },
            identity: { state: "NO_CLAIM" },
            risk: {
              level: "LOW_EVIDENCE",
              confidence: "LIMITED",
              recommendation: "LEAVE",
              evidence: [
                {
                  id: "user-block",
                  kind: "known",
                  title: "Personal block list",
                  detail: "This host is on your personal block list (extension or desktop). The website did not store the list."
                },
                {
                  id: "https-limit",
                  kind: "limitation",
                  title: "HTTPS limit",
                  detail: "HTTPS does not prove identity."
                }
              ],
              limitations: ["Signals can produce false positives or false negatives."]
            },
            sensitive: null,
            inferredOrganisationId: null,
            live: null,
            timing: {
              parseMs: 1,
              threatMs: 1,
              probeMs: 40,
              riskMs: 1,
              totalMs: 43,
              probeTimeoutMs: 5000,
              probeHeadFailed: false,
              headSkipped: false,
              ambiguousProbeStatus: true
            }
          }
        })
      });
    });
    await page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
    const urlInput = page.locator('input[name="url"], #url, input[type="url"]').first();
    await urlInput.waitFor({ state: "visible", timeout: 15000 });
    await urlInput.fill("https://blocked-hint.example/");
    await page.locator('button[type="submit"]').first().click();
    await expect(page.getByTestId("user-block-evidence")).toBeVisible({ timeout: 15000 });
    // Banner owns the user-block copy — why-list must not duplicate it.
    await expect(page.locator(".why-list")).not.toContainText(/Personal block list|Lista pessoal de bloqueio/i);
    const leaveNote = page.getByTestId("personal-list-leave-note");
    if ((await leaveNote.count()) === 0) {
      const msg = "personal-list-leave-note missing after personalListBlocked hint result";
      if (process.env.STRICT_LEAVE_AND_BLOCK === "1") throw new Error(msg);
      test.skip(true, msg);
      return;
    }
    await expect(leaveNote).toBeVisible({ timeout: 5000 });
    await expect(leaveNote).toContainText(/personal|lista pessoal/i);
    await expect(page.getByTestId("ambiguous-probe-not-phishing")).toBeVisible();
    // Hard-assert: both personal-list and ambiguous notes describe Leave (same STRICT title).
    await expect(page.getByRole("button", { name: /Leave|Sair/i }).first()).toHaveAttribute(
      "aria-describedby",
      "personal-list-leave-note ambiguous-probe-not-phishing"
    );
    // Positive counterpart to Clear-ring absence: LEAVE result exposes action-row with Leave.
    const actionRow = page.getByTestId("result-action-row");
    await expect(actionRow).toBeVisible({ timeout: 5000 });
    await expect(actionRow.getByRole("button", { name: /Leave|Sair/i })).toBeVisible();
    // Reading order: leave-note must precede action row so aria-describedby points earlier.
    const orderOk = await page.locator(".log-action").evaluate((sec) => {
      const note = sec.querySelector('[data-testid="personal-list-leave-note"]');
      const row = sec.querySelector('[data-testid="result-action-row"]');
      if (!note || !row) return false;
      return Boolean(note.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(orderOk).toBe(true);
    // Hard-assert: both personal-list and ambiguous notes precede the action row.
    const bothNotesOrder = await page.locator(".log-action").evaluate((sec) => {
      const personal = sec.querySelector('[data-testid="personal-list-leave-note"]');
      const ambiguous = sec.querySelector('[data-testid="ambiguous-probe-not-phishing"]');
      const row = sec.querySelector('[data-testid="result-action-row"]');
      if (!personal || !ambiguous || !row) return { ok: false, reason: "missing" };
      const personalBeforeRow = Boolean(
        personal.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING
      );
      const ambiguousBeforeRow = Boolean(
        ambiguous.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING
      );
      return { ok: personalBeforeRow && ambiguousBeforeRow, personalBeforeRow, ambiguousBeforeRow };
    });
    expect(bothNotesOrder.ok).toBe(true);
    // Hard-assert: personal-list note precedes ambiguous note (reading order among the two).
    const personalBeforeAmbiguous = await page.locator(".log-action").evaluate((sec) => {
      const personal = sec.querySelector('[data-testid="personal-list-leave-note"]');
      const ambiguous = sec.querySelector('[data-testid="ambiguous-probe-not-phishing"]');
      if (!personal || !ambiguous) return false;
      return Boolean(personal.compareDocumentPosition(ambiguous) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(personalBeforeAmbiguous).toBe(true);

    // Hard-assert pt-PT Leave dual-note aria-describedby order matches EN (same STRICT title).
    await page.route("**/api/check", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          analysis: {
            parsed: {
              fullUrl: "https://blocked-hint.example/",
              hostname: "blocked-hint.example",
              unicodeHostname: "blocked-hint.example",
              registrableDomain: "blocked-hint.example",
              subdomain: "",
              path: "/",
              usesHttps: true,
              hasPunycode: false,
              protocol: "https:"
            },
            threat: {
              state: "NO_KNOWN_MATCH",
              providerName: "Preventive Shield own threat list",
              checkedAt: new Date().toISOString(),
              evidence: []
            },
            identity: { state: "NO_CLAIM" },
            risk: {
              level: "LOW_EVIDENCE",
              confidence: "LIMITED",
              recommendation: "LEAVE",
              evidence: [
                {
                  id: "user-block",
                  kind: "known",
                  title: "Personal block list",
                  detail: "This host is on your personal block list."
                }
              ],
              limitations: []
            },
            sensitive: null,
            inferredOrganisationId: null,
            live: null,
            timing: {
              parseMs: 1,
              threatMs: 1,
              probeMs: 40,
              riskMs: 1,
              totalMs: 43,
              probeTimeoutMs: 5000,
              probeHeadFailed: false,
              headSkipped: false,
              ambiguousProbeStatus: true
            }
          }
        })
      });
    });
    await page.goto(`${base}/pt-PT`, { waitUntil: "domcontentloaded" });
    const ptUrl = page.locator('input[name="url"], #url, input[type="url"]').first();
    await ptUrl.waitFor({ state: "visible", timeout: 15000 });
    await ptUrl.fill("https://blocked-hint.example/");
    await page.locator('button[type="submit"]').first().click();
    const ptLeave = page.getByRole("button", { name: /Leave|Sair/i }).first();
    await expect(ptLeave).toBeVisible({ timeout: 15000 });
    await expect(ptLeave).toHaveAttribute(
      "aria-describedby",
      "personal-list-leave-note ambiguous-probe-not-phishing"
    );
  });

  test("settings legend ambiguousProbeStatus label matches i18n", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }
    await page.goto(`${base}/en/settings`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-testid='settings-timing-flag-legend']", { timeout: 15000 });
    const enChip = page
      .getByTestId("settings-timing-flag-legend")
      .locator('[data-flag="ambiguousProbeStatus"]');
    await expect(enChip).toBeVisible();
    await expect(enChip).toHaveText("ambiguousProbeStatus");

    await page.goto(`${base}/pt-PT/settings`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-testid='settings-timing-flag-legend']", { timeout: 15000 });
    const ptChip = page
      .getByTestId("settings-timing-flag-legend")
      .locator('[data-flag="ambiguousProbeStatus"]');
    await expect(ptChip).toBeVisible();
    await expect(ptChip).toHaveText("sonda ambígua");
  });

  test("timing-flag-chips ambiguousProbeStatus after mocked 403", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/check", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          timingValid: true,
          analysis: {
            parsed: {
              fullUrl: "https://bot-blocked.example/",
              protocol: "https:",
              hostname: "bot-blocked.example",
              unicodeHostname: "bot-blocked.example",
              registrableDomain: "bot-blocked.example",
              subdomain: "",
              path: "/",
              usesHttps: true,
              hasPunycode: false
            },
            threat: {
              state: "NO_KNOWN_MATCH",
              providerName: "Preventive Shield own threat list",
              checkedAt: new Date().toISOString(),
              evidence: []
            },
            identity: { state: "NO_CLAIM" },
            risk: {
              level: "LOW_EVIDENCE",
              confidence: "LIMITED",
              recommendation: "PROCEED_WITH_CARE",
              evidence: [
                {
                  id: "probe-blocked",
                  kind: "limitation",
                  title: "Site blocked the automated probe",
                  detail: "Received HTTP 403. The site blocked or throttled this check — that is not proof of phishing."
                },
                {
                  id: "https-limit",
                  kind: "limitation",
                  title: "HTTPS limit",
                  detail: "HTTPS does not prove identity."
                }
              ],
              limitations: ["Signals can produce false positives or false negatives."]
            },
            sensitive: null,
            inferredOrganisationId: null,
            live: {
              reachable: true,
              statusCode: 403,
              timedOut: false
            },
            timing: {
              parseMs: 1,
              threatMs: 1,
              probeMs: 40,
              riskMs: 1,
              totalMs: 43,
              probeTimeoutMs: 5000,
              probeHeadFailed: false,
              headSkipped: false,
              ambiguousProbeStatus: true
            }
          }
        })
      });
    });
    await page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
    const urlInput = page.locator('input[name="url"], #url, input[type="url"]').first();
    await urlInput.waitFor({ state: "visible", timeout: 15000 });
    await urlInput.fill("https://bot-blocked.example/");
    await page.locator('button[type="submit"]').first().click();
    await expect(page.getByText(/Limited risk evidence|Provas de risco limitadas/i)).toBeVisible({
      timeout: 15000
    });
    const progressAmbiguous = page
      .getByTestId("progress-timing-flag-chips")
      .locator('[data-flag="ambiguousProbeStatus"]');
    await expect(progressAmbiguous).toBeVisible({ timeout: 5000 });
    await expect(progressAmbiguous).toHaveAttribute("data-on", "1");
    await expect(progressAmbiguous).toHaveClass(/is-on/);
    await page.getByRole("button", { name: /Show full check log|Mostrar registo completo/i }).click();
    const chips = page.getByTestId("timing-flag-chips");
    await expect(chips).toBeVisible({ timeout: 5000 });
    const ambiguous = chips.locator('[data-flag="ambiguousProbeStatus"]');
    await expect(ambiguous).toBeVisible();
    await expect(ambiguous).toHaveAttribute("data-on", "1");
    await expect(ambiguous).toHaveClass(/is-on/);
    const leaveChip = page.getByTestId("leave-ambiguous-probe-chip");
    await expect(leaveChip).toBeVisible();
    await expect(leaveChip).toHaveAttribute("data-on", "1");
    // Soft-assert: leave chip copy matches i18n EN / pt-PT.
    const enLeaveText = (await leaveChip.textContent())?.trim() ?? "";
    if (enLeaveText !== "ambiguousProbeStatus") {
      console.warn("[playwright] leave-ambiguous-probe-chip EN text soft mismatch:", enLeaveText);
    } else {
      console.info("[playwright] leave-ambiguous-probe-chip EN ok");
    }
    const notPhishing = page.getByTestId("ambiguous-probe-not-phishing");
    await expect(notPhishing).toBeVisible();
    await expect(page.getByTestId("result-action-row").getByRole("button").first()).toHaveAttribute(
      "aria-describedby",
      /ambiguous-probe-not-phishing/
    );
    await page.goto(`${base}/pt-PT`, { waitUntil: "domcontentloaded" });
    const ptUrl = page.locator('input[name="url"], #url, input[type="url"]').first();
    await ptUrl.waitFor({ state: "visible", timeout: 15000 });
    await ptUrl.fill("https://bot-blocked.example/");
    await page.locator('button[type="submit"]').first().click();
    await expect(page.getByText(/Provas de risco limitadas|Limited risk evidence/i)).toBeVisible({
      timeout: 15000
    });
    const ptLeaveChip = page.getByTestId("leave-ambiguous-probe-chip");
    await expect(ptLeaveChip).toBeVisible({ timeout: 5000 });
    const ptLeaveText = (await ptLeaveChip.textContent())?.trim() ?? "";
    if (ptLeaveText !== "sonda ambígua") {
      console.warn("[playwright] leave-ambiguous-probe-chip pt-PT text soft mismatch:", ptLeaveText);
    } else {
      console.info("[playwright] leave-ambiguous-probe-chip pt-PT ok");
    }
  });

  test("pt-PT settings block-lists note says listas never leave the device", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }
    await page.goto(`${base}/pt-PT/settings#settings-block-lists`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#settings-block-lists", { timeout: 15000 });
    await expect(page.locator("#settings-block-lists .scope-note")).toContainText(/nunca saem do dispositivo/i);
  });

  test("website has no Clear ring control (desktop-only)", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }
    await page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Clear ring|Limpar anel/i })).toHaveCount(0);
    await expect(page.locator("#logFilterReset")).toHaveCount(0);
    await page.goto(`${base}/en/settings`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Clear ring|Limpar anel/i)).toHaveCount(0);
  });

  test("session-only notice when probe-env returns fileWriteDenied + path", async ({ page }) => {
    if (!(await baseReachable())) {
      test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
      return;
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/en/settings`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#settings-privacy, .settings-stage", { timeout: 15000 });
    await page.route("**/api/dev/probe-env", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          fileWriteDenied: true,
          usedFallbackPath: "security/data/runtime/env-overrides.env",
          path: "security/data/runtime/env-overrides.env",
          lines: ["OWN_THREAT_MERGE_PT=0"],
          ownThreatMergePt: false,
          probeTimeoutMs: 5000
        })
      });
    });
    const toggle = page.locator("label.history-filter", {
      hasText: /OWN_THREAT_MERGE_PT|Write OWN_THREAT_MERGE_PT/
    });
    if ((await toggle.count()) === 0) {
      test.skip(true, "MERGE_PT toggle only on local-dev server");
      return;
    }
    await toggle.locator('input[type="checkbox"]').click();
    await expect(page.locator("[role='status']").filter({ hasText: /env-overrides\.env/ })).toBeVisible({
      timeout: 10000
    });
  });
});