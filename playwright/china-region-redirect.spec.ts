/**
 * China entry auto-switches to Workers when health is OK; stay opt-out skips bounce.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/china-region-redirect.spec.ts
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();
const html = readFileSync(join(root, "china-pages/index.html"), "utf8");
const reach = readFileSync(join(root, "china-pages/reachability.js"), "utf8");
const persist = readFileSync(join(root, "china-pages/lang-persist.js"), "utf8");
const regionRedirect = readFileSync(join(root, "china-pages/region-redirect.js"), "utf8");
const css = readFileSync(join(root, "china-pages/styles.css"), "utf8");

function serveChinaEntry() {
  return createServer((req, res) => {
    const url = req.url || "/";
    if (url.startsWith("/reachability.js")) {
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
      res.end(reach);
      return;
    }
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
        .replace(/src="\.?\/?reachability\.js"/, 'src="/reachability.js"')
        .replace(/src="\.?\/?region-redirect\.js"/, 'src="/region-redirect.js"')
        .replace(/href="\.?\/?styles\.css"/, 'href="/styles.css"')
        .replace(/href="\.?\/?assets\/tokens\.css"/, 'href="/styles.css"'),
    );
  });
}

test("entry redirects to Workers when health ok", async ({ page }) => {
  const server = serveChinaEntry();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };

  await page.route("**/api/health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        service: "buusdocst",
        curatedListPresent: true,
        accountSyncEnabled: false,
      }),
    });
  });

  try {
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/buusdocst\.mtsu\.workers\.dev\/(zh-Hans|zh-Hant|en)/, {
      timeout: 10_000,
    });
    expect(page.url()).toMatch(/buusdocst\.mtsu\.workers\.dev\/(zh-Hans|zh-Hant|en)/);
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

test("china_stay=1 keeps entry on China Pages", async ({ page }) => {
  const server = serveChinaEntry();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };

  await page.route("**/api/health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        service: "buusdocst",
        curatedListPresent: true,
        accountSyncEnabled: false,
      }),
    });
  });

  try {
    await page.goto(`http://127.0.0.1:${port}/?china_stay=1`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByTestId("china-stay-link")).toBeVisible();
    await expect(page.locator("#workers-reach")).toHaveAttribute("data-state", "ok", {
      timeout: 10_000,
    });
    expect(page.url()).toContain(`127.0.0.1:${port}`);
    expect(page.url()).not.toMatch(/workers\.dev/);
    const stay = await page.evaluate(() => localStorage.getItem("buusdocst-china-stay"));
    expect(stay).toBe("1");
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
