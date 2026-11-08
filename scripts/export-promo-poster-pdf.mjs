/**
 * Headless A4 PDF export of public/promo/poster.html (Playwright Chromium).
 *
 *   npm run export:promo-poster-pdf
 *
 * Output: docs/promo/poster.pdf (+ mirrored to public/promo/poster.pdf)
 */
import { createServer } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const promo = path.join(root, "public/promo");
const outDocs = path.join(root, "docs/promo/poster.pdf");
const outPublic = path.join(root, "public/promo/poster.pdf");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".css": "text/css",
  ".md": "text/plain; charset=utf-8",
};

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const rel = urlPath === "/" ? "/poster.html" : urlPath;
  const file = path.join(promo, rel.replace(/^\//, ""));
  if (!file.startsWith(promo) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end("missing");
    return;
  }
  const ext = path.extname(file);
  res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();

/** Prefer bundled Chromium; fall back to installed Google Chrome channel. */
async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/Executable doesn't exist/i.test(msg)) {
      console.warn("[export-promo-poster-pdf] bundled Chromium missing — trying channel=chrome");
      return chromium.launch({ channel: "chrome", headless: true });
    }
    throw err;
  }
}

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/poster.html`, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
    preferCSSPageSize: true,
  });
  fs.mkdirSync(path.dirname(outDocs), { recursive: true });
  fs.writeFileSync(outDocs, pdf);
  fs.writeFileSync(outPublic, pdf);
  console.info(`[export-promo-poster-pdf] OK ${outDocs} (${pdf.length} bytes)`);
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}
