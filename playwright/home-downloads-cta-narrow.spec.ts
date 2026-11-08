/**
 * ≤360px: nav Downloads hidden; home + result CTAs remain visible.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/home-downloads-cta-narrow.spec.ts
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

test("narrow CSS hides nav-downloads but keeps home-downloads-cta", () => {
  const css = readFileSync("app/shield.css", "utf8");
  expect(css).toMatch(/@media \(max-width:\s*360px\)/);
  const block = css.match(/@media \(max-width:\s*360px\)\s*\{([\s\S]*?)\n\}/);
  expect(block?.[1] || "").toMatch(/nav-downloads[\s\S]*display:\s*none/);
  expect(block?.[1] || "").toMatch(/home-downloads-cta[\s\S]*display:\s*block/);
});

test("AppShell renders home-downloads-cta on idle and result (analysis) views", () => {
  const shell = readFileSync("components/AppShell.tsx", "utf8");
  expect(shell).toMatch(/settings#settings-desktop/);
  expect(shell).toMatch(/homeDownloadsCta/);
  const ctaCount = [...shell.matchAll(/data-testid="home-downloads-cta"/g)].length;
  expect(ctaCount).toBeGreaterThanOrEqual(2);
  expect(shell).toMatch(/RiskResult[\s\S]*home-downloads-cta/);
});

test("360px viewport: result-view Downloads CTA is visible while nav-downloads is hidden", async ({
  page
}) => {
  const tokens = readFileSync("shared/tokens.css", "utf8");
  const shield = readFileSync("app/shield.css", "utf8");
  const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>${tokens}${shield}</style>
</head>
<body>
  <div class="shell">
    <header class="top">
      <nav class="top-nav">
        <a class="nav-link" data-testid="nav-downloads" href="/en/settings#settings-desktop">Downloads</a>
      </nav>
    </header>
    <main id="result" class="stage">
      <p class="hint home-downloads-cta" data-testid="home-downloads-cta">
        <a class="text-button" href="/en/settings#settings-desktop">Desktop app downloads</a>
      </p>
    </main>
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
    await page.setViewportSize({ width: 360, height: 720 });
    await page.goto(`http://127.0.0.1:${port}/`);
    await expect(page.getByTestId("nav-downloads")).toBeHidden();
    await expect(page.getByTestId("home-downloads-cta")).toBeVisible();
    await expect(page.getByTestId("home-downloads-cta").getByRole("link")).toBeVisible();
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});
