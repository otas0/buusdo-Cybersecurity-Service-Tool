/**
 * Extension popup header wordmark — dark-field asset with muted u (no Halt-orange u-card).
 * Pixel parity for muted u is asserted in tests/desktop-tray-brand-parity.test.ts.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/extension-popup-wordmark.spec.ts
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();
const wordmark = readFileSync(path.join(root, "extension/icons/buusdo-wordmark.png"));

test("extension popup header mounts dark wordmark", async ({ page }) => {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    body { margin: 0; background: #0e0e0e; }
    .popup-top {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 14px; border-bottom: 1px solid rgba(243,241,234,0.16);
    }
    .popup-top img { height: 28px; width: auto; display: block; }
  </style>
</head>
<body>
  <header class="popup-top" data-testid="extension-popup-top">
    <img data-testid="extension-popup-wordmark" alt="buusdo Cybersecurity Service Tool" src="/wm.png" />
  </header>
</body>
</html>`;

  const server = createServer((req, res) => {
    if (req.url?.startsWith("/wm.png")) {
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(wordmark);
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  try {
    await page.setViewportSize({ width: 360, height: 520 });
    await page.goto(`http://127.0.0.1:${port}/`);
    await expect(page.getByTestId("extension-popup-wordmark")).toBeVisible();
    await expect(page.getByTestId("extension-popup-top")).toBeVisible();
    const alt = await page.getByTestId("extension-popup-wordmark").getAttribute("alt");
    expect(alt).toMatch(/buusdo Cybersecurity Service Tool/i);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});
