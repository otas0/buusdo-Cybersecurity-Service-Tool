/**
 * Extension popup: xh / st langSelect exposes localized China notice + clear-stay short links.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/extension-popup-xh-st-china-links.spec.ts
 */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();

function mime(p: string) {
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
  if (p.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

for (const locale of [
  { id: "xh", notice: "Vula isaziso", clear: "Susa ukuhlala" },
  { id: "st", notice: "Bula tsebiso", clear: "Hlakola ho dula" }
] as const) {
  test(`popup langSelect ${locale.id} paints China notice/clear short links`, async ({ page }) => {
    const server = createServer((req, res) => {
      const url = (req.url || "/").split("?")[0];
      let file = "";
      if (url === "/" || url === "/popup.html") {
        file = path.join(root, "extension/popup/popup.html");
      } else if (url.startsWith("/")) {
        const rel = url.replace(/^\//, "");
        const candidates = [
          path.join(root, "extension/popup", rel),
          path.join(root, "extension", rel),
          path.join(root, rel)
        ];
        file = candidates.find((c) => existsSync(c)) || "";
      }
      if (!file || !existsSync(file)) {
        res.writeHead(404);
        res.end();
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
        storage: {
          local: {
            get: async () => ({ lang: "en" }),
            set: async () => {}
          }
        },
        runtime: {
          sendMessage: async () => ({ ok: true, state: { lang: "en" } }),
          onMessage: { addListener() {} }
        },
        tabs: { query: async () => [] }
      };
    });

    try {
      await page.goto(`http://127.0.0.1:${port}/popup.html`, { waitUntil: "domcontentloaded" });
      const select = page.locator("#langSelect");
      await expect(select).toBeVisible();

      const painted = await page.evaluate(async (lang) => {
        const mod = await import("/shared/i18n.js");
        const { t } = mod as { t: (l: string, k: string) => string };
        return {
          notice: t(lang, "websiteApiChinaNoticeLink"),
          clear: t(lang, "websiteApiChinaStayClearLink"),
          option: Boolean(
            document.querySelector(`#langSelect option[value="${lang}"]`)
          )
        };
      }, locale.id);

      expect(painted.option).toBe(true);
      expect(painted.notice).toBe(locale.notice);
      expect(painted.clear).toBe(locale.clear);
      expect(painted.notice).not.toBe("Open notice");
      expect(painted.clear).not.toBe("Clear stay");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
    }
  });
}
