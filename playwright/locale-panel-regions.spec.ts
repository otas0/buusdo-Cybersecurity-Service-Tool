/**
 * Language panel: search + region accordion (no Frequent strip).
 * Empty-state assert (`langPanelNoMatches`) rides `npm run test:playwright:locales` in CI.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/locale-panel-regions.spec.ts
 */
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { waitForReactHydration } from "./helpers/spa-settings-nav";

const base = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const afPack = JSON.parse(readFileSync("i18n/packs/af.json", "utf8")) as {
  langPanelSearchPlaceholder: string;
  langPanelNoMatches: string;
};

test.describe("language panel regions", () => {
  test("opens with current region; no Frequent strip; search filters", async ({ page }) => {
    await page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
    await waitForReactHydration(page, '[data-testid="locale-toggle"]');
    await page.getByTestId("locale-toggle").click();
    await expect(page.getByTestId("locale-panel")).toBeVisible();
    await expect(page.getByTestId("locale-frequent")).toHaveCount(0);
    await expect(page.getByTestId("locale-search")).toBeVisible();
    await expect(page.getByTestId("locale-search")).toHaveAttribute(
      "placeholder",
      /Search language/i
    );
    await expect(page.getByTestId("locale-option-en")).toBeVisible();
    await expect(page.getByTestId("locale-option-it")).toHaveCount(0);
    await page.getByTestId("locale-region-europe").getByRole("button").first().click();
    await expect(page.getByTestId("locale-option-it")).toBeVisible();
    await page.getByTestId("locale-search").fill("polski");
    await expect(page.getByTestId("locale-option-pl")).toBeVisible();
  });

  test("search placeholder + empty state use localized pack keys on /af", async ({ page }) => {
    await page.goto(`${base}/af`, { waitUntil: "domcontentloaded" });
    await waitForReactHydration(page, '[data-testid="locale-toggle"]');
    await page.getByTestId("locale-toggle").click();
    await expect(page.getByTestId("locale-search")).toHaveAttribute(
      "placeholder",
      afPack.langPanelSearchPlaceholder
    );
    await page.getByTestId("locale-search").fill("zzzz-no-such-locale");
    await expect(page.getByTestId("locale-empty")).toHaveText(afPack.langPanelNoMatches);
  });

  test("pt-PT opens with europe region expanded by default", async ({ page }) => {
    await page.goto(`${base}/pt-PT`, { waitUntil: "domcontentloaded" });
    await waitForReactHydration(page, '[data-testid="locale-toggle"]');
    await page.getByTestId("locale-toggle").click();
    await expect(page.getByTestId("locale-panel")).toBeVisible();
    await expect(page.getByTestId("locale-frequent")).toHaveCount(0);
    const europe = page.getByTestId("locale-region-europe");
    await expect(europe.getByRole("button").first()).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("locale-option-pt-PT")).toBeVisible();
    await expect(page.getByTestId("locale-option-it")).toBeVisible();
    await expect(page.getByTestId("locale-option-en")).toHaveCount(0);
  });

  test("light theme lang-panel uses --panel-edge (visible vs cream --panel)", async ({ page }) => {
    const tokens = readFileSync("shared/tokens.css", "utf8");
    const shield = readFileSync("app/shield.css", "utf8");
    expect(tokens).toMatch(/--panel-edge:\s*rgba\(26,\s*25,\s*22,\s*0\.36\)/);
    expect(shield).toMatch(/border:\s*1px solid var\(--panel-edge/);

    const html = `<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8" />
  <style>
    ${tokens}
    ${shield}
  </style>
</head>
<body>
  <div class="shell">
    <div class="lang-switch">
      <div class="lang-panel" data-testid="locale-panel" style="position:static; display:flex;">
        <input class="lang-panel-search" data-testid="locale-search" />
      </div>
    </div>
  </div>
</body>
</html>`;
    const server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    try {
      await page.goto(`http://127.0.0.1:${port}/`);
      const border = await page.getByTestId("locale-panel").evaluate((el) => {
        const s = getComputedStyle(el);
        return { color: s.borderTopColor, width: s.borderTopWidth };
      });
      expect(border.width).toBe("1px");
      // rgba(26,25,22,0.36) → roughly 26,25,22 with alpha baked by engine
      expect(border.color).toMatch(/26,\s*25,\s*22/);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
    }
  });
});
