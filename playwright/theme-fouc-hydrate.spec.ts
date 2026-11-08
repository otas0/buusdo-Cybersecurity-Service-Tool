/**
 * FOUC boot script + React hydrateThemeFromStorage must not race back to dark.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/theme-fouc-hydrate.spec.ts
 */
import { createServer } from "node:http";
import { expect, test } from "@playwright/test";

const boot =
  "(function(){try{var t=localStorage.getItem('buusdocst-ui-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}}catch(e){}})();";

const hydrate =
  "(function(){try{var t=localStorage.getItem('buusdocst-ui-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}else{document.documentElement.dataset.theme='dark';document.documentElement.style.colorScheme='dark';}}catch(e){document.documentElement.dataset.theme='dark';}})();";

const fixtureHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <script>${boot}</script>
  <style>
    :root, :root[data-theme="dark"] { --bg: #0e0e0e; --panel: #161616; }
    :root[data-theme="light"] { --bg: #f3f1ea; --panel: #ebe8df; }
    body { margin: 0; background: var(--bg); }
    #probe { width: 40px; height: 40px; background: var(--panel); }
  </style>
</head>
<body>
  <div id="probe" data-testid="theme-probe"></div>
  <button type="button" data-testid="theme-switch">Light</button>
  <script>
    setTimeout(function () { ${hydrate} }, 0);
  </script>
</body>
</html>`;

test("FOUC light boot survives ThemeToggle hydrate race", async ({ page }) => {
  const server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fixtureHtml);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  try {
    await page.addInitScript(() => {
      localStorage.setItem("buusdocst-ui-theme", "light");
    });
    await page.goto(`http://127.0.0.1:${port}/`);
    await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.theme)).toBe(
      "light"
    );
    await page.waitForTimeout(50);
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe("light");
    const bg = await page
      .getByTestId("theme-probe")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toMatch(/235,\s*232,\s*223/);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});
