/**
 * Light theme: locale panel background tracks --panel (#ebe8df).
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/theme-locale-panel.spec.ts
 */
import { createServer } from "node:http";
import { expect, test } from "@playwright/test";

const fixtureHtml = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root, :root[data-theme="dark"] {
      --bg: #0e0e0e; --panel: #161616; --text: #f3f1ea; --muted: #8d897f; --halt: #ff4d00;
      --mono: ui-monospace, Menlo, monospace;
    }
    :root[data-theme="light"] {
      --bg: #f3f1ea; --panel: #ebe8df; --text: #1a1916; --muted: #5c584f;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: Helvetica, Arial, sans-serif; }
    .shell { max-width: 920px; margin: 0 auto; padding: 28px 16px; }
    .top { display: flex; justify-content: flex-end; gap: 8px; align-items: center; }
    .theme-toggle { display: inline-flex; gap: 2px; }
    .nav-link { font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
      color: var(--muted); background: transparent; border: 0; cursor: pointer; padding: 4px 6px; }
    .theme-opt.is-active { color: var(--halt); outline: 1px solid var(--halt); outline-offset: 2px; }
    .lang-switch { position: relative; }
    .lang-badge { min-width: 2.5rem; min-height: 1.75rem; border: 1px solid color-mix(in srgb, var(--muted) 45%, transparent);
      background: transparent; color: var(--text); font-family: var(--mono); font-size: 11px; cursor: pointer; }
    .lang-panel {
      position: absolute; top: calc(100% + 6px); right: 0; width: 16rem;
      background: var(--panel); color: var(--text);
      border: 1px solid color-mix(in srgb, var(--muted) 40%, transparent); padding: 8px;
    }
  </style>
</head>
<body>
  <main class="shell">
    <header class="top">
      <div class="theme-toggle" data-testid="theme-switch" role="group">
        <button type="button" class="nav-link theme-opt is-active" data-testid="theme-dark">Dark</button>
        <button type="button" class="nav-link theme-opt" data-testid="theme-light">Light</button>
      </div>
      <div class="lang-switch" data-testid="locale-switch">
        <button type="button" class="lang-badge" data-testid="locale-toggle">EN</button>
        <div class="lang-panel" data-testid="locale-panel" hidden>Languages</div>
      </div>
    </header>
  </main>
  <script>
    const root = document.documentElement;
    const darkBtn = document.querySelector('[data-testid="theme-dark"]');
    const lightBtn = document.querySelector('[data-testid="theme-light"]');
    const panel = document.querySelector('[data-testid="locale-panel"]');
    const toggle = document.querySelector('[data-testid="locale-toggle"]');
    function setTheme(t) {
      root.dataset.theme = t;
      darkBtn.classList.toggle('is-active', t === 'dark');
      lightBtn.classList.toggle('is-active', t === 'light');
    }
    darkBtn.addEventListener('click', () => setTheme('dark'));
    lightBtn.addEventListener('click', () => setTheme('light'));
    toggle.addEventListener('click', () => { panel.hidden = !panel.hidden; });
  </script>
</body>
</html>`;

function parseRgb(cssColor: string): { r: number; g: number; b: number } {
  const m = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) throw new Error(`unexpected color ${cssColor}`);
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
}

function near(a: number, b: number, tol = 8) {
  return Math.abs(a - b) <= tol;
}

test("light theme locale-panel background ≈ #ebe8df", async ({ page }) => {
  const server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fixtureHtml);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  try {
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.getByTestId("theme-light").click();
    await page.getByTestId("locale-toggle").click();
    const panel = page.getByTestId("locale-panel");
    await expect(panel).toBeVisible();
    const bg = await panel.evaluate((el) => getComputedStyle(el).backgroundColor);
    const { r, g, b } = parseRgb(bg);
    // #ebe8df → 235, 232, 223
    expect(near(r, 235) && near(g, 232) && near(b, 223), `got ${bg}`).toBeTruthy();
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});
