/**
 * China notice: wrong health.service → stay on notice (no Workers bounce).
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/china-soft-fail.spec.ts
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();
const html = readFileSync(join(root, "china-pages/index.html"), "utf8");
const persist = readFileSync(join(root, "china-pages/lang-persist.js"), "utf8");
const regionRedirect = readFileSync(join(root, "china-pages/region-redirect.js"), "utf8");
const css = readFileSync(join(root, "china-pages/styles.css"), "utf8");

test("China health soft-fail when service ≠ buusdocst stays on notice", async ({ page }) => {
  const server = createServer((req, res) => {
    const url = req.url || "/";
    if (url.startsWith("/region-redirect.js")) {
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
      res.end(regionRedirect);
      return;
    }
    if (url.startsWith("/lang-persist.js")) {
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
      res.end(persist);
      return;
    }
    if (url.startsWith("/styles.css") || url.startsWith("/assets/tokens.css")) {
      res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
      res.end(css);
      return;
    }
    if (url.startsWith("/assets/")) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      html
        .replace(/src="\.?\/?lang-persist\.js"/, 'src="/lang-persist.js"')
        .replace(/src="\.?\/?region-redirect\.js"/, 'src="/region-redirect.js"')
        .replace(/href="\.?\/?styles\.css"/, 'href="/styles.css"')
        .replace(/href="\.?\/?assets\/tokens\.css"/, 'href="/styles.css"'),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };

  await page.route("**/api/health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
      body: JSON.stringify({
        ok: true,
        service: "pcpd",
        curatedListPresent: true,
        accountSyncEnabled: false,
      }),
    });
  });

  try {
    await page.goto(`http://127.0.0.1:${port}/?china_stay=0`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("china-notice")).toBeVisible();
    await expect(page.getByTestId("china-notice-title")).toBeVisible();
    const reachEl = page.locator("#workers-reach");
    await expect(reachEl).toHaveAttribute("data-state", "fail", { timeout: 10_000 });
    expect(page.url()).toContain(`127.0.0.1:${port}`);
    expect(page.url()).not.toMatch(/workers\.dev/);
  } finally {
    try {
      const anyServer = server as typeof server & { closeAllConnections?: () => void };
      anyServer.closeAllConnections?.();
    } catch {
      /* ignore */
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
