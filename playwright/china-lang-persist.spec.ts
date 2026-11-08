/**
 * China Pages: language persist across Entry / Install; EN → 中文 does not bounce.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/china-lang-persist.spec.ts
 */
import { createServer, type Server } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { expect, test } from "@playwright/test";

const root = join(process.cwd(), "china-pages");

const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function startStaticServer() {
  const server = createServer((req, res) => {
    let url = (req.url || "/").split("?")[0];
    if (url === "/") url = "/index.html";
    const file = join(root, decodeURIComponent(url.replace(/^\//, "")));
    if (!file.startsWith(root) || !existsSync(file)) {
      res.writeHead(404);
      res.end("missing");
      return;
    }
    const type = mime[extname(file)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(readFileSync(file));
  });
  return new Promise<{ server: Server; port: number }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as { port: number };
      resolve({ server, port });
    });
  });
}

function closeServer(server: Server) {
  try {
    const anyServer = server as Server & { closeAllConnections?: () => void };
    anyServer.closeAllConnections?.();
  } catch {
    /* ignore */
  }
  server.close();
}

test("EN preference keeps Install on install-en", async ({ page }) => {
  const { server, port } = await startStaticServer();
  const base = `http://127.0.0.1:${port}`;
  try {
    await page.goto(`${base}/en.html?china_lang=en`, { waitUntil: "domcontentloaded" });
    expect(await page.evaluate(() => localStorage.getItem("buusdocst-china-lang"))).toBe("en");

    await page.locator(".china-site-nav a", { hasText: /^Install$/ }).click({ noWaitAfter: true });
    await expect(page).toHaveURL(/install-en\.html/, { timeout: 8_000 });
  } finally {
    closeServer(server);
  }
});

test("EN then 中文 stays on Chinese page (no bounce back to EN)", async ({ page }) => {
  const { server, port } = await startStaticServer();
  const base = `http://127.0.0.1:${port}`;
  try {
    await page.goto(`${base}/en.html?china_lang=en`, { waitUntil: "domcontentloaded" });
    expect(await page.evaluate(() => localStorage.getItem("buusdocst-china-lang"))).toBe("en");

    await page.goto(`${base}/index.html?china_lang=zh`, { waitUntil: "domcontentloaded" });
    expect(page.url()).toMatch(/index\.html/);
    expect(page.url()).not.toMatch(/\/en\.html(\?|$)/);
    expect(await page.evaluate(() => localStorage.getItem("buusdocst-china-lang"))).toBe("zh");

    await page.goto(`${base}/en.html?china_lang=en`, { waitUntil: "domcontentloaded" });
    await page.locator('a[data-china-lang="zh"]').click({ noWaitAfter: true });
    await expect(page).toHaveURL(/index\.html/, { timeout: 8_000 });
    expect(await page.evaluate(() => localStorage.getItem("buusdocst-china-lang"))).toBe("zh");
  } finally {
    closeServer(server);
  }
});
