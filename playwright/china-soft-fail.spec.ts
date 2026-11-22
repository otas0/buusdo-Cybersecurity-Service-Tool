/**
 * China notice: soft-fail (wrong service), timeout (AbortError), CORS/preflight.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/china-soft-fail.spec.ts
 */
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();
const html = readFileSync(join(root, "china-pages/index.html"), "utf8");
const persist = readFileSync(join(root, "china-pages/lang-persist.js"), "utf8");
const regionRedirect = readFileSync(join(root, "china-pages/region-redirect.js"), "utf8");
const css = readFileSync(join(root, "china-pages/styles.css"), "utf8");

async function serveNotice(): Promise<{ server: Server; port: number }> {
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
  return { server, port };
}

async function closeServer(server: Server) {
  try {
    const anyServer = server as Server & { closeAllConnections?: () => void };
    anyServer.closeAllConnections?.();
  } catch {
    /* ignore */
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

test("China health soft-fail when service ≠ buusdocst stays on notice", async ({ page }) => {
  const { server, port } = await serveNotice();

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
    const reachEl = page.locator("#workers-reach");
    await expect(reachEl).toHaveAttribute("data-state", "soft-fail", { timeout: 10_000 });
    await expect(reachEl).not.toHaveAttribute("data-state", "checking");
    await expect(reachEl).toHaveAttribute("aria-busy", "false");
    expect(page.url()).not.toMatch(/workers\.dev/);
  } finally {
    await closeServer(server);
  }
});

test("China health AbortError / timeout uses timeout fail copy", async ({ page }) => {
  // Fast AbortController timeout (patched script) + hung health → AbortError path.
  const fastRedirect = regionRedirect.replace("TIMEOUT_MS = 8000", "TIMEOUT_MS = 250");
  const server = createServer((req, res) => {
    const url = req.url || "/";
    if (url.startsWith("/region-redirect.js")) {
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
      res.end(fastRedirect);
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

  await page.route("**/api/health", async () => {
    await new Promise(() => {
      /* never settle — AbortController fires */
    });
  });

  try {
    await page.goto(`http://127.0.0.1:${port}/?china_stay=0`, { waitUntil: "domcontentloaded" });
    const reachEl = page.locator("#workers-reach");
    await expect(reachEl).toHaveAttribute("data-state", "fail", { timeout: 5_000 });
    await expect(reachEl.locator("[data-reach-status]")).toContainText(/超时|timed out/i);
    await expect(reachEl.locator("[data-reach-detail]")).toContainText(/超时|timed out/i);
    await expect(reachEl).not.toHaveAttribute("data-state", "checking");
  } finally {
    await closeServer(server);
  }
});

test("China health CORS / Failed to fetch uses preflight fail copy", async ({ page }) => {
  const { server, port } = await serveNotice();

  await page.route("**/api/health", async (route) => {
    await route.abort("failed");
  });

  try {
    await page.goto(`http://127.0.0.1:${port}/?china_stay=0`, { waitUntil: "domcontentloaded" });
    const reachEl = page.locator("#workers-reach");
    await expect(reachEl).toHaveAttribute("data-state", "fail", { timeout: 10_000 });
    // Playwright abort("failed") → Failed to fetch → preflight path (not AbortError timeout).
    await expect(reachEl.locator("[data-reach-detail]")).toContainText(/OPTIONS\/CORS|Failed to fetch|拦截|blocked/i);
    await expect(reachEl).not.toHaveAttribute("data-state", "checking");
  } finally {
    await closeServer(server);
  }
});
