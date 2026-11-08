/**
 * 320px: theme toggle + language badge stay on one top-bar row (no wrap crush).
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/top-bar-theme-lang-narrow.spec.ts
 */
import { createServer } from "node:http";
import { expect, test } from "@playwright/test";

const fixtureHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root { --bg:#0e0e0e; --text:#f3f1ea; --muted:#8d897f; --line:rgba(243,241,234,0.16);
      --halt:#ff4d00; --mono:ui-monospace,Menlo,monospace; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: Helvetica, Arial, sans-serif; }
    .shell { max-width: 920px; margin: 0 auto; padding: 28px 16px 48px; }
    .shell .top {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 0 0 18px; border-bottom: 1px solid var(--line); flex-wrap: nowrap;
    }
    .shell .brand-logo { display: block; height: 32px; width: auto; max-width: min(160px, 48vw); background: #222; }
    .shell .top-nav {
      display: flex; align-items: center; gap: 6px; flex-wrap: nowrap; min-width: 0;
    }
    .theme-toggle { display: inline-flex; gap: 0; flex-shrink: 0; }
    .theme-toggle .nav-link {
      font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--muted); background: transparent; border: 0; padding: 4px 5px; white-space: nowrap;
    }
    .theme-opt.is-active { color: var(--halt); outline: 1px solid var(--halt); outline-offset: 1px; }
    .shell .lang-switch { position: relative; display: inline-flex; min-width: 2.5rem; max-width: 2.75rem; flex-shrink: 0; }
    .shell .lang-badge {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 2.5rem; min-height: 1.75rem; padding: 4px 6px;
      border: 1px solid color-mix(in srgb, var(--muted) 45%, transparent);
      font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em;
    }
  </style>
</head>
<body>
  <main class="shell">
    <header class="top" data-testid="top-bar">
      <div class="brand">
        <img class="brand-logo" width="117" height="32" alt="buusdo Cybersecurity Service Tool"
          src="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="117" height="32"><rect width="117" height="32" fill="#333"/><text x="6" y="22" fill="#f3f1ea" font-size="12" font-family="sans-serif">buusdo</text></svg>')}" />
      </div>
      <nav class="top-nav" data-testid="top-nav-chrome">
        <div class="theme-toggle" data-testid="theme-switch">
          <button type="button" class="nav-link theme-opt is-active" data-testid="theme-dark">Dark</button>
          <button type="button" class="nav-link theme-opt" data-testid="theme-light">Light</button>
        </div>
        <div class="lang-switch" data-testid="locale-switch">
          <span class="lang-badge" data-testid="locale-toggle">EN</span>
        </div>
      </nav>
    </header>
  </main>
</body>
</html>`;

test("320px top bar: theme + language stay one row", async ({ page }) => {
  const server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fixtureHtml);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  try {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(`http://127.0.0.1:${port}/`);
    const top = page.getByTestId("top-bar");
    const theme = page.getByTestId("theme-switch");
    const lang = page.getByTestId("locale-toggle");
    await expect(top).toBeVisible();
    await expect(theme).toBeVisible();
    await expect(lang).toBeVisible();

    const topBox = await top.boundingBox();
    const themeBox = await theme.boundingBox();
    const langBox = await lang.boundingBox();
    expect(topBox).toBeTruthy();
    expect(themeBox).toBeTruthy();
    expect(langBox).toBeTruthy();
    expect(topBox!.height).toBeLessThan(96);
    // Same row: vertical centers within 12px
    const midTheme = themeBox!.y + themeBox!.height / 2;
    const midLang = langBox!.y + langBox!.height / 2;
    expect(Math.abs(midTheme - midLang)).toBeLessThan(12);
    // No horizontal overflow past viewport
    expect(themeBox!.x + themeBox!.width).toBeLessThanOrEqual(321);
    expect(langBox!.x + langBox!.width).toBeLessThanOrEqual(321);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});
