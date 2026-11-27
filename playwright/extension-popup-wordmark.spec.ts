/**
 * Extension popup — real popup.html fixture (not a mini header stub).
 * Dark: muted u pixels. Light: on-light plate visible, on-dark hidden.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/extension-popup-wordmark.spec.ts
 */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import sharp from "sharp";

const root = process.cwd();
const popupHtmlPath = path.join(root, "extension/popup/popup.html");
const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2"
};

function resolveUnderExtension(urlPath: string): string | null {
  const clean = urlPath.split("?")[0] || "/";
  const rel = clean === "/" || clean === "/popup.html" ? "popup/popup.html" : clean.replace(/^\//, "");
  const candidates = [
    path.join(root, "extension", rel),
    path.join(root, "extension/popup", rel),
    path.join(root, "extension", rel.replace(/^\.\.\//, ""))
  ];
  for (const c of candidates) {
    const resolved = path.resolve(c);
    if (
      !resolved.startsWith(path.resolve(root, "extension")) &&
      !resolved.startsWith(path.resolve(root, "shared"))
    ) {
      continue;
    }
    if (existsSync(resolved)) return resolved;
  }
  const icon = path.join(root, "extension/icons", path.basename(clean));
  if (existsSync(icon)) return icon;
  const shared = path.join(
    root,
    "shared",
    clean.replace(/^\/?shared\//, "").replace(/^\.\.\/shared\//, "")
  );
  if (clean.includes("shared") && existsSync(shared)) return shared;
  return null;
}

async function servePopup() {
  const raw = readFileSync(popupHtmlPath, "utf8");
  const html = raw
    .replaceAll('href="../shared/', 'href="/shared/')
    .replaceAll('src="../icons/', 'src="/icons/')
    .replaceAll('src="../shared/', 'src="/shared/')
    .replaceAll('href="popup.css"', 'href="/popup/popup.css"')
    .replaceAll('src="popup.js"', 'src="/popup/popup.js"');

  const server = createServer((req, res) => {
    const url = req.url || "/";
    if (url === "/" || url.startsWith("/popup.html")) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }
    let file: string | null = null;
    if (url.startsWith("/icons/")) {
      file = path.join(root, "extension/icons", path.basename(url.split("?")[0]));
    } else if (url.startsWith("/shared/")) {
      file = path.join(root, "shared", url.slice("/shared/".length).split("?")[0]);
    } else if (url.startsWith("/popup/")) {
      file = path.join(root, "extension/popup", url.slice("/popup/".length).split("?")[0]);
    } else {
      file = resolveUnderExtension(url);
    }
    if (!file || !existsSync(file)) {
      res.writeHead(404);
      res.end(`missing ${url}`);
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
    res.end(readFileSync(file));
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  return { server, port };
}

test("extension popup.html mounts real header wordmark (dark)", async ({ page }) => {
  const { server, port } = await servePopup();
  try {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width: 360, height: 560 });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");

    const dark = page.locator("header.top img.brand-logo-on-dark");
    const light = page.locator("header.top img.brand-logo-on-light");
    await expect(dark).toBeVisible();
    await expect(light).toBeHidden();
    await expect(dark).toHaveAttribute("alt", /buusdo Cybersecurity Service Tool/i);
    await expect(light).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator("#manageListsLink")).toBeVisible();
    await expect(page.locator("#scanBtn")).toHaveCount(0);
    await expect(page.locator("#langSelect")).toHaveCount(0);

    const png = await dark.screenshot({ type: "png" });
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let muted = 0;
    let orange = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      if (data[i + 3] < 180) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (Math.abs(r - 0x8d) <= 22 && Math.abs(g - 0x89) <= 22 && Math.abs(b - 0x7f) <= 22) muted += 1;
      if (r >= 160 && g <= 120 && b <= 60 && r > g + 40) orange += 1;
    }
    expect(muted, `rendered popup wordmark muted u (#8d897f) missing (muted=${muted})`).toBeGreaterThan(40);
    expect(orange, `rendered popup wordmark must not show Halt-orange u (orange=${orange})`).toBeLessThan(40);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});

test("extension popup light theme shows on-light wordmark only", async ({ page }) => {
  const { server, port } = await servePopup();
  try {
    await page.emulateMedia({ colorScheme: "light" });
    await page.setViewportSize({ width: 360, height: 560 });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.theme === "light");

    const dark = page.locator("header.top img.brand-logo-on-dark");
    const light = page.locator("header.top img.brand-logo-on-light");
    await expect(light).toBeVisible();
    await expect(dark).toBeHidden();
    await expect(light).toHaveAttribute("alt", /buusdo Cybersecurity Service Tool/i);
    await expect(dark).toHaveAttribute("aria-hidden", "true");
    await expect(dark).toHaveAttribute("alt", "");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});
