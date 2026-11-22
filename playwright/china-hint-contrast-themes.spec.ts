/**
 * China Pages .hint contrast under dark + light themes (live DOM snapshot).
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/china-hint-contrast-themes.spec.ts
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

function contrastRatio(fg: string, bg: string): number {
  const parse = (c: string) => {
    const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) throw new Error(`bad color ${c}`);
    return [Number(m[1]), Number(m[2]), Number(m[3])].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
  };
  const L = (rgb: [number, number, number]) =>
    0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  const a = L(parse(fg));
  const b = L(parse(bg));
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

for (const theme of ["dark", "light"] as const) {
  test(`china region-redirect hint AA under ${theme} theme`, async ({ page }) => {
    const tokens = readFileSync("china-pages/assets/tokens.css", "utf8");
    const index = readFileSync("china-pages/index.html", "utf8");
    const hintMatch = index.match(
      /<p class="hint" data-testid="china-region-redirect-hint">([\s\S]*?)<\/p>/
    );
    expect(hintMatch).toBeTruthy();
    const html = `<!doctype html>
<html lang="zh-Hans" data-theme="${theme}">
<head>
  <meta charset="utf-8" />
  <style>
    ${tokens}
    body { margin: 0; background: var(--bg); color: var(--text); font-family: sans-serif; padding: 24px; }
    .hint { color: var(--muted); font-size: 14px; line-height: 1.45; max-width: 40rem; }
  </style>
</head>
<body>
  <p class="hint" data-testid="china-region-redirect-hint">${hintMatch![1]}</p>
</body>
</html>`;
    const server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    try {
      await page.goto(`http://127.0.0.1:${port}/`);
      const hint = page.getByTestId("china-region-redirect-hint");
      await expect(hint).toBeVisible();
      const colors = await hint.evaluate((el) => {
        const cs = getComputedStyle(el);
        const body = getComputedStyle(document.body);
        return { fg: cs.color, bg: body.backgroundColor };
      });
      const ratio = contrastRatio(colors.fg, colors.bg);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      await expect(hint).toHaveScreenshot(`china-region-hint-${theme}.png`, {
        animations: "disabled",
        maxDiffPixelRatio: 0.12
      });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
    }
  });
}
