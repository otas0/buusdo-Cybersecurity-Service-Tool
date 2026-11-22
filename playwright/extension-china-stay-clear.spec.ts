/**
 * Extension clear-stay: when a China Pages tab is open, update that tab (same origin).
 * Chromium live harness — mocks chrome.tabs around china-pages-open.mjs.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/extension-china-stay-clear.spec.ts
 */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();
const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
};

const harness = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>clear-stay harness</title></head>
<body>
  <button type="button" data-testid="clear-stay-btn">Clear stay</button>
  <pre data-testid="clear-stay-result"></pre>
  <script type="module">
    import { openChinaPagesUrl } from "/extension/shared/china-pages-open.mjs";
    const ORIGIN = "https://otas0.github.io";
    const CLEAR = "https://otas0.github.io/buusdocst/?china_stay=0";
    const updates = [];
    const opens = [];
    window.__clearStay = { updates, opens };
    document.querySelector("[data-testid=clear-stay-btn]").addEventListener("click", async () => {
      const result = await openChinaPagesUrl({
        url: CLEAR,
        origin: ORIGIN,
        preferSameOrigin: true,
        tabs: {
          query: async () => [
            { id: 42, url: "https://otas0.github.io/buusdocst/?china_stay=1", windowId: 1 },
            { id: 7, url: "https://example.com/" }
          ],
          update: async (id, props) => {
            updates.push({ id, url: String(props.url), active: props.active });
          }
        },
        windows: { update: async () => undefined },
        openBlank: (u) => { opens.push(u); }
      });
      document.querySelector("[data-testid=clear-stay-result]").textContent = JSON.stringify({
        result,
        updates,
        opens
      });
    });
  </script>
</body>
</html>`;

test("Chromium: clear-stay updates open China Pages tab (same origin)", async ({ page }) => {
  const server = createServer((req, res) => {
    const url = (req.url || "/").split("?")[0];
    if (url === "/" || url === "/harness.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(harness);
      return;
    }
    if (url.startsWith("/extension/")) {
      const file = join(root, decodeURIComponent(url.replace(/^\//, "")));
      if (!file.startsWith(root) || !existsSync(file)) {
        res.writeHead(404);
        res.end("missing");
        return;
      }
      res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream" });
      res.end(readFileSync(file));
      return;
    }
    res.writeHead(404);
    res.end("missing");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };

  try {
    await page.goto(`http://127.0.0.1:${port}/harness.html`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("clear-stay-btn").click();
    const out = page.getByTestId("clear-stay-result");
    await expect(out).not.toHaveText("", { timeout: 5_000 });
    const payload = JSON.parse(await out.textContent() || "{}");
    expect(payload.result).toBe("same-origin");
    expect(payload.opens).toEqual([]);
    expect(payload.updates).toEqual([
      { id: 42, url: "https://otas0.github.io/buusdocst/?china_stay=0", active: true },
    ]);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
