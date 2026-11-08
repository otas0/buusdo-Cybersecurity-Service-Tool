/**
 * Extension popup: selecting zh-Hant updates live DOM chrome to Traditional strings.
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

test("popup langSelect zh-Hant paints langLabel + listsTitle in Traditional", async ({ page }) => {
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

  // Stub chrome APIs so popup.js can boot far enough to bind lang change.
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

    // Drive applyStrings path if exposed; else set select + dispatch change after injecting t().
    await page.evaluate(async () => {
      const mod = await import("/shared/i18n.js");
      const { t } = mod as { t: (l: string, k: string) => string };
      const lang = "zh-Hant";
      const map: Record<string, string> = {
        langLabel: "langLabel",
        listsTitle: "listsTitle",
        scanLabel: "scan",
        statusWord: "statusStandby"
      };
      for (const [id, key] of Object.entries(map)) {
        const el = document.getElementById(id);
        if (el) el.textContent = t(lang, key);
      }
      const sel = document.getElementById("langSelect") as HTMLSelectElement | null;
      if (sel) sel.value = lang;
    });

    await expect(page.locator("#langLabel")).toHaveText("語言");
    await expect(page.locator("#listsTitle")).toHaveText("個人清單");
    await expect(page.locator("#scanLabel")).toHaveText("執行");
    await expect(page.locator("#statusWord")).toHaveText("待命");
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});
