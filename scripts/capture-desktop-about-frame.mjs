/**
 * Capture Desktop About footer strip as a store FRAME (live HTML, not tray composite).
 *
 *   npm run capture:desktop-about-frame
 *
 * Output: docs/store-screenshots/FRAME-desktop-about.png
 */
import { createServer } from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
/** Prefer the user’s Playwright cache when sandbox/temp cache is empty or incomplete. */
{
  const homeCache = path.join(os.homedir(), "Library/Caches/ms-playwright");
  const forced = process.env.PLAYWRIGHT_BROWSERS_PATH;
  const forcedOk =
    forced &&
    fs.existsSync(forced) &&
    fs.readdirSync(forced).some((n) => n.startsWith("chromium"));
  if (!forcedOk && fs.existsSync(homeCache)) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = homeCache;
  }
}
const out = path.join(root, "docs/store-screenshots/FRAME-desktop-about.png");
const indexHtml = fs.readFileSync(path.join(root, "desktop-app/public/index.html"), "utf8");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const html = indexHtml
  .replaceAll('href="/', 'href="/')
  .replaceAll('src="/', 'src="/');

const server = createServer((req, res) => {
  const url = (req.url || "/").split("?")[0];
  if (url === "/" || url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }
  const rel = url.replace(/^\//, "");
  const candidates = [
    path.join(root, "desktop-app/public", rel),
    path.join(root, "desktop-app/public/brand", path.basename(rel)),
  ];
  const file = candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!file) {
    res.writeHead(404);
    res.end(`missing ${url}`);
    return;
  }
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
  res.end(fs.readFileSync(file));
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 720, height: 900 },
    deviceScaleFactor: 2,
  });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const foot = page.locator('[data-testid="foot-about"]');
  await foot.waitFor({ state: "visible", timeout: 15_000 });
  // Ensure footer is in view
  await foot.scrollIntoViewIfNeeded();
  await foot.screenshot({ path: out, type: "png" });
  console.info(`[capture-desktop-about-frame] wrote ${path.relative(root, out)}`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
