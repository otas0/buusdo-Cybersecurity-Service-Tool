/**
 * Slim popup: no langSelect — status + manage-lists link mount; OS lang paints strings.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/extension-popup-zh-hant-live.spec.ts
 */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();

function mime(p: string) {
  if (p.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  return "application/octet-stream";
}

test("slim popup mounts status + manage lists (no langSelect)", async ({ page }) => {
  const server = createServer((req, res) => {
    const url = (req.url || "/").split("?")[0];
    let file = "";
    if (url === "/" || url === "/popup.html") {
      file = join(root, "extension/popup/popup.html");
    } else if (url.startsWith("/")) {
      const rel = url.replace(/^\//, "");
      const candidates = [
        join(root, "extension/popup", rel),
        join(root, "extension", rel),
        join(root, "extension/shared", rel.replace(/^shared\//, "")),
        join(root, "extension/icons", rel.replace(/^icons\//, "")),
        join(root, "extension", rel.replace(/^\.\.\//, ""))
      ];
      file = candidates.find((c) => existsSync(c)) || "";
    }
    if (!file || !existsSync(file)) {
      res.writeHead(404);
      res.end(`missing ${url}`);
      return;
    }
    res.writeHead(200, { "Content-Type": mime(file) });
    res.end(readFileSync(file));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };

  await page.addInitScript(() => {
    // @ts-expect-error test stub
    window.chrome = {
      i18n: { getUILanguage: () => "zh-TW" },
      storage: {
        local: {
          get: async () => ({}),
          set: async () => {}
        }
      },
      runtime: {
        sendMessage: async () => ({
          ok: true,
          state: { lang: "zh-Hant", lastScan: { level: "idle", trackersBlocked: 0, phishingHits: 0 } }
        }),
        onMessage: { addListener() {} }
      },
      tabs: { query: async () => [] }
    };
  });

  try {
    await page.goto(`http://127.0.0.1:${port}/popup.html`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#langSelect")).toHaveCount(0);
    await expect(page.locator("#scanBtn")).toHaveCount(0);
    await expect(page.getByTestId("extension-status")).toBeVisible();
    await expect(page.getByTestId("extension-manage-lists")).toBeVisible();
    await expect
      .poll(async () => page.locator("#statusWord").textContent())
      .toMatch(/待命|Standby|就绪|Pronto/);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});
