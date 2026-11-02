/**
 * Export diagnostics Halt outline: keyboard Tab → :focus-visible (Never store).
 * Serves tokens + dashboard.css + a minimal fixture (no desktop server).
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/diagnostics-export-focus-visible.spec.ts
 */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { trackDocumentLoads } from "./helpers/spa-settings-nav";

const root = path.resolve(".");
const cssPath = path.join(root, "desktop-app/public/css/dashboard.css");
const tokensPath = path.join(root, "shared/tokens.css");

test("#diagnosticsExport.halt-outline shows stronger Halt on :focus-visible", async ({ page }) => {
  if (!existsSync(cssPath) || !existsSync(tokensPath)) {
    test.skip(true, "dashboard.css or tokens.css missing");
    return;
  }

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="/tokens.css" />
  <link rel="stylesheet" href="/dashboard.css" />
</head>
<body style="background:#161616;padding:24px">
  <button type="button" id="focus-start" data-testid="focus-start">Start</button>
  <button type="button" id="diagnosticsExport" class="text-button halt-outline" data-testid="diagnostics-export">
    Export diagnostics
  </button>
</body>
</html>`;

  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname === "/dashboard.css") {
      res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
      res.end(readFileSync(cssPath));
      return;
    }
    if (url.pathname === "/tokens.css") {
      res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
      res.end(readFileSync(tokensPath));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const { port } = server.address() as { port: number };

  try {
    const loads = trackDocumentLoads(page);
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load" });
    expect(loads.count).toBe(1);
    const btn = page.getByTestId("diagnostics-export");
    await expect(btn).toBeVisible();

    await btn.click();
    const afterClick = await btn.evaluate((el) => {
      const s = getComputedStyle(el);
      return { outlineWidth: s.outlineWidth, outlineStyle: s.outlineStyle };
    });
    // Mouse: resting Halt outline stays thin (≤1px); :focus-visible strengthens to ≥2px.
    expect(afterClick.outlineStyle).not.toBe("none");
    expect(Number.parseFloat(afterClick.outlineWidth)).toBeLessThanOrEqual(1);

    await page.getByTestId("focus-start").focus();
    await page.keyboard.press("Tab");
    await expect(btn).toBeFocused();
    const afterTab = await btn.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        outlineWidth: s.outlineWidth,
        outlineColor: s.outlineColor,
        outlineStyle: s.outlineStyle
      };
    });
    expect(afterTab.outlineStyle).not.toBe("none");
    expect(Number.parseFloat(afterTab.outlineWidth)).toBeGreaterThanOrEqual(2);
    // --halt in shared/tokens.css is #ff4d00 → rgb(255, 77, 0)
    expect(afterTab.outlineColor.replace(/\s/g, "")).toMatch(/^rgba?\(255,\s*77,\s*0/);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});