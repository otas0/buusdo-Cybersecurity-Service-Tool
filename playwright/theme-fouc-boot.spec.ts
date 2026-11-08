/**
 * Theme boot script sets data-theme before paint (FOUC guard).
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/theme-fouc-boot.spec.ts
 */
import { createServer } from "node:http";
import { expect, test } from "@playwright/test";

const boot =
  "(function(){try{var t=localStorage.getItem('buusdocst-ui-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}}catch(e){}})();";

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
</body>
</html>`;

test("FOUC boot applies stored light theme before body paint probe", async ({ page }) => {
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
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe("light");
    const bg = await page.getByTestId("theme-probe").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toMatch(/235,\s*232,\s*223/); // #ebe8df
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});
