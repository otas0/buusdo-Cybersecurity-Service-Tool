/**
 * LocaleRecommendModal: empty search pins described by hint; typing clears aria-describedby.
 * Visual regression PNGs under playwright/__screenshots__/locale-recommend-aria/
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/locale-recommend-aria-describedby.spec.ts
 */
import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const shotDir = join("playwright", "__screenshots__", "locale-recommend-aria");

const fixture = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <style>
    body { margin: 0; background: #0e0e0e; color: #f3f1ea; font-family: ui-monospace, monospace; }
    .locale-recommend-card { padding: 16px; max-width: 22rem; }
    .hint { color: #8d897f; font-size: 12px; }
    .lang-option { display: block; width: 100%; text-align: left; margin: 4px 0; padding: 6px 8px;
      background: transparent; color: inherit; border: 1px solid #3a3a3a; }
    .locale-recommend-search { width: 100%; margin: 8px 0; padding: 6px; background: #161616; color: inherit; border: 1px solid #3a3a3a; }
    .locale-recommend-list { list-style: none; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div class="locale-recommend" data-testid="locale-recommend">
    <div class="locale-recommend-card">
      <input class="locale-recommend-search" data-testid="locale-recommend-search" type="search"
        placeholder="Search language…" value="" />
      <p id="locale-recommend-search-hint" class="hint" data-testid="locale-recommend-search-hint">
        Pinned suggestions below. Search to browse the full language list.
      </p>
      <ul class="locale-recommend-list" data-testid="locale-recommend-list"
          aria-describedby="locale-recommend-search-hint">
        <li><button type="button" class="lang-option" data-testid="locale-recommend-option-en"
              aria-describedby="locale-recommend-search-hint">English</button></li>
        <li><button type="button" class="lang-option" data-testid="locale-recommend-option-ja"
              aria-describedby="locale-recommend-search-hint">日本語</button></li>
      </ul>
    </div>
  </div>
  <script>
    const input = document.querySelector('[data-testid="locale-recommend-search"]');
    const hint = document.querySelector('[data-testid="locale-recommend-search-hint"]');
    const list = document.querySelector('[data-testid="locale-recommend-list"]');
    const pins = [...document.querySelectorAll('[data-testid^="locale-recommend-option-"]')];
    function sync() {
      const q = input.value.trim();
      if (!q) {
        hint.hidden = false;
        list.setAttribute('aria-describedby', 'locale-recommend-search-hint');
        pins.forEach((b) => b.setAttribute('aria-describedby', 'locale-recommend-search-hint'));
      } else {
        hint.hidden = true;
        list.removeAttribute('aria-describedby');
        pins.forEach((b) => b.removeAttribute('aria-describedby'));
      }
    }
    input.addEventListener('input', sync);
  </script>
</body>
</html>`;

test("empty search pins have aria-describedby; typing clears it (screenshot pair)", async ({
  page
}) => {
  mkdirSync(shotDir, { recursive: true });
  const server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fixture);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  try {
    await page.goto(`http://127.0.0.1:${port}/`);
    const pin = page.getByTestId("locale-recommend-option-en");
    const list = page.getByTestId("locale-recommend-list");
    await expect(pin).toHaveAttribute("aria-describedby", "locale-recommend-search-hint");
    await expect(list).toHaveAttribute("aria-describedby", "locale-recommend-search-hint");
    await expect(page.getByTestId("locale-recommend-search-hint")).toBeVisible();
    await page.getByTestId("locale-recommend").screenshot({
      path: join(shotDir, "pins-with-hint.png")
    });

    await page.getByTestId("locale-recommend-search").fill("polski");
    await expect(pin).not.toHaveAttribute("aria-describedby", "locale-recommend-search-hint");
    await expect(list).not.toHaveAttribute("aria-describedby", "locale-recommend-search-hint");
    await expect(page.getByTestId("locale-recommend-search-hint")).toBeHidden();
    await page.getByTestId("locale-recommend").screenshot({
      path: join(shotDir, "pins-after-search.png")
    });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});
