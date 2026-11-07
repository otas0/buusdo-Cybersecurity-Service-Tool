/**
 * China Pages: wrong health.service → soft-fail (not network fail).
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/china-soft-fail.spec.ts
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();
const html = readFileSync(join(root, "china-pages/index.html"), "utf8");
const reach = readFileSync(join(root, "china-pages/reachability.js"), "utf8");
const css = readFileSync(join(root, "china-pages/styles.css"), "utf8");

test("China health soft-fail when service ≠ buusdocst", async ({ page }) => {
  const server = createServer((req, res) => {
    const url = req.url || "/";
    if (url.startsWith("/reachability.js")) {
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
      res.end(reach);
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
    // Point script at local reachability.js
    res.end(
      html
        .replace(/src="\.?\/?reachability\.js"/, 'src="/reachability.js"')
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
      body: JSON.stringify({
        ok: true,
        service: "pcpd",
        curatedListPresent: true,
        accountSyncEnabled: false,
      }),
    });
  });

  try {
    await page.goto(`http://127.0.0.1:${port}/`);
    const reachEl = page.locator("#workers-reach");
    await expect(reachEl).toHaveAttribute("data-state", "soft-fail", { timeout: 10_000 });
    await expect(page.locator("[data-reach-status]")).toContainText(/service 异常|unexpected service/i);
    const cta = page.locator("[data-full-check]").first();
    await expect(cta).toHaveClass(/ghost-button/);
    await expect(cta).not.toHaveClass(/is-disabled/);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
});
