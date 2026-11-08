/**
 * Light theme shows on-light wordmark; dark shows on-dark (cream) wordmark.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/theme-wordmark-swap.spec.ts
 */
import { createServer } from "node:http";
import { expect, test } from "@playwright/test";

const fixtureHtml = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <style>
    :root, :root[data-theme="dark"] { --bg:#0e0e0e; --halt:#ff4d00; --muted:#8d897f; --text:#f3f1ea; }
    :root[data-theme="light"] { --bg:#f3f1ea; --text:#1a1916; --muted:#5c584f; }
    body { margin:0; background:var(--bg); color:var(--text); }
    .brand-logo { display:block; height:40px; }
    .brand-logo-on-light { display: none; }
    :root[data-theme="light"] .brand-logo-on-dark { display: none; }
    :root[data-theme="light"] .brand-logo-on-light { display: block; }
    .nav-link { font: 11px monospace; color: var(--muted); background:transparent; border:0; cursor:pointer; }
  </style>
</head>
<body class="shell">
  <header>
    <img class="brand-logo brand-logo-on-dark" data-testid="wordmark-dark" alt="dark" width="117" height="40"
      src="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="117" height="40"><rect fill="#333" width="117" height="40"/><text x="8" y="26" fill="#f3f1ea" font-size="14">dark</text></svg>')}" />
    <img class="brand-logo brand-logo-on-light" data-testid="wordmark-light" alt="" aria-hidden="true" width="117" height="40"
      src="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="117" height="40"><rect fill="#ebe8df" width="117" height="40"/><text x="8" y="26" fill="#1a1916" font-size="14">light</text></svg>')}" />
    <button type="button" class="nav-link" data-testid="theme-switch">Light</button>
  </header>
  <script>
    const btn = document.querySelector('[data-testid="theme-switch"]');
    btn.addEventListener('click', () => {
      const root = document.documentElement;
      const next = root.dataset.theme === 'light' ? 'dark' : 'light';
      root.dataset.theme = next;
      btn.textContent = next === 'dark' ? 'Light' : 'Dark';
    });
  </script>
</body>
</html>`;

test("wordmark swaps on-dark ↔ on-light with theme toggle", async ({ page }) => {
  const server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fixtureHtml);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  try {
    await page.goto(`http://127.0.0.1:${port}/`);
    const dark = page.getByTestId("wordmark-dark");
    const light = page.getByTestId("wordmark-light");
    await expect(dark).toBeVisible();
    await expect(light).toBeHidden();

    await page.getByTestId("theme-switch").click();
    await expect(light).toBeVisible();
    await expect(dark).toBeHidden();

    await page.getByTestId("theme-switch").click();
    await expect(dark).toBeVisible();
    await expect(light).toBeHidden();
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});
