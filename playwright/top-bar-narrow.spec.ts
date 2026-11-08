/**
 * Top bar + locale badge at 320 / 375 — geometry + committed screenshots.
 *
 * Uses a static fixture (no Next required) so CI can assert PNGs under
 * playwright/__screenshots__/top-bar-narrow.spec.ts/
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/top-bar-narrow.spec.ts
 *   UPDATE_TOP_BAR_SHOTS=1 … --update-snapshots
 */
import { createServer } from "node:http";
import { expect, test } from "@playwright/test";

const fixtureHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      --bg: #0e0e0e; --text: #f3f1ea; --muted: #8d897f;
      --line: rgba(243,241,234,0.16); --mono: ui-monospace, Menlo, monospace;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: Helvetica, Arial, sans-serif; }
    .shell { max-width: 920px; margin: 0 auto; padding: 28px 16px 48px; }
    .shell .top {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 0 0 18px; border-bottom: 1px solid var(--line);
    }
    .shell .brand-logo { display: block; height: 40px; width: auto; max-width: min(220px, 55vw); background: #222; }
    .shell .lang-switch { position: relative; display: inline-flex; min-width: 2.75rem; min-height: 2rem; max-width: 3.2rem; }
    .shell .lang-select { position: absolute; inset: 0; opacity: 0; width: 100%; height: 100%; }
    .shell .lang-badge {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 2.5rem; min-height: 1.75rem; padding: 4px 8px;
      border: 1px solid color-mix(in srgb, var(--muted) 45%, transparent);
      font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em;
    }
    @media (max-width: 360px) {
      .shell .brand-logo { height: 32px; max-width: min(160px, 48vw); }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header class="top" data-testid="top-bar">
      <div class="brand">
        <img class="brand-logo" width="117" height="40" alt="buusdo Cybersecurity Service Tool" src="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="117" height="40"><rect width="117" height="40" fill="#333"/><text x="8" y="26" fill="#f3f1ea" font-size="14" font-family="sans-serif">buusdo</text></svg>')}" />
      </div>
      <label class="lang-switch" data-testid="locale-switch">
        <select class="lang-select" data-testid="locale-select" aria-label="Language"><option>EN</option></select>
        <span class="lang-badge" data-testid="locale-toggle">EN</span>
      </label>
    </header>
  </main>
</body>
</html>`;

for (const width of [320, 375] as const) {
  test(`top bar brand + locale badge @ ${width}px`, async ({ page }) => {
    const server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(fixtureHtml);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    try {
      await page.setViewportSize({ width, height: 720 });
      await page.goto(`http://127.0.0.1:${port}/`);
      const top = page.getByTestId("top-bar");
      await expect(top).toBeVisible();
      await expect(page.getByTestId("locale-toggle")).toBeVisible();
      const box = await top.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeLessThan(120);
      expect(box!.width).toBeLessThanOrEqual(width + 1);

      await expect(top).toHaveScreenshot(`top-bar-${width}.png`, {
        animations: "disabled",
        maxDiffPixelRatio: 0.08
      });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
    }
  });
}
