/**
 * Open ops/home-continue-timeline.html via Playwright, export PNG.
 * Expects desktop-app/dist/smoke-currentDir-timeline.json from home-continue smoke.
 *
 *   node scripts/export-home-continue-png.mjs
 */

import { createServer } from "node:http";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(".");
const timeline = path.join(root, "desktop-app/dist/smoke-currentDir-timeline.json");
const outPng = path.join(root, "desktop-app/dist/smoke-currentDir-timeline.png");
const htmlPath = path.join(root, "ops/home-continue-timeline.html");

if (!existsSync(timeline)) {
  console.log("export-home-continue-png: no timeline JSON — skip");
  process.exit(0);
}
if (!existsSync(htmlPath)) {
  console.error("ops/home-continue-timeline.html missing");
  process.exit(1);
}

mkdirSync(path.dirname(outPng), { recursive: true });

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".js": "text/javascript; charset=utf-8"
};

const server = createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/ops/home-continue-timeline.html";
  const file = path.join(root, rel.replace(/^\//, ""));
  if (!file.startsWith(root) || !existsSync(file)) {
    res.writeHead(404);
    res.end("missing");
    return;
  }
  const ext = path.extname(file);
  res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
  res.end(readFileSync(file));
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const tag = process.env.SHIELD_RELEASE_TAG || process.env.RELEASE_TAG || "";
const runId = process.env.GITHUB_RUN_ID || "";
const q = new URLSearchParams({
  file: "/desktop-app/dist/smoke-currentDir-timeline.json"
});
if (tag) q.set("tag", tag);
if (runId) q.set("run", runId);
const pageUrl = `http://127.0.0.1:${port}/ops/home-continue-timeline.html?${q.toString()}`;

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 720 } });
  await page.goto(pageUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("#exportPng:not([disabled])", { timeout: 15000 }).catch(() => null);
  if (tag) {
    const caption = await page.getByTestId("home-continue-stamp").textContent();
    if (!caption || !caption.includes(tag)) {
      throw new Error(
        `export-home-continue-png: on-page stamp missing tag "${tag}" (got ${JSON.stringify(caption)})`
      );
    }
    console.log(`export-home-continue-png: on-page stamp ok (${caption.trim()})`);
    const svg = page.getByTestId("home-continue-svg");
    const aria = await svg.getAttribute("aria-label");
    if (!aria || !aria.includes(tag)) {
      throw new Error(
        `export-home-continue-png: SVG aria-label missing tag "${tag}" before Export (got ${JSON.stringify(aria)})`
      );
    }
    const titleText = await svg.locator("title").textContent();
    if (!titleText || titleText.trim() !== aria.trim()) {
      throw new Error(
        `export-home-continue-png: SVG <title> must match aria-label when tag set (title=${JSON.stringify(titleText)} aria=${JSON.stringify(aria)})`
      );
    }
    // stampLabel is shared for tag-only and tag+run — require exact equality with SVG title.
    const stampText = caption.trim();
    const title = titleText.trim();
    if (stampText !== title) {
      throw new Error(
        `export-home-continue-png: stamp must equal SVG title when tag set (stamp=${JSON.stringify(stampText)} title=${JSON.stringify(title)})`
      );
    }
    console.log(`export-home-continue-png: stamp === SVG title ok (${stampText})`);
    console.log(`export-home-continue-png: SVG aria-label + title ok (${aria})`);
  }
  // Prefer in-page canvas export; fall back to chart screenshot.
  const enabled = await page.locator("#exportPng").isEnabled().catch(() => false);
  if (enabled) {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }).catch(() => null),
      page.click("#exportPng")
    ]);
    if (download) {
      await download.saveAs(outPng);
      console.log(`export-home-continue-png: wrote ${outPng} via download`);
    } else {
      await page.locator(".chart").screenshot({ path: outPng });
      console.log(`export-home-continue-png: wrote ${outPng} via chart screenshot`);
    }
  } else {
    await page.locator(".chart").screenshot({ path: outPng });
    console.log(`export-home-continue-png: wrote ${outPng} via chart screenshot (export disabled)`);
  }
} finally {
  await browser.close();
  server.close();
}

/** CRC-32 for PNG chunk (ISO 3309 / PNG annex D). */
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** Insert a tEXt chunk before IEND so the file stays a valid PNG. */
function injectPngText(pngBuf, key, value) {
  const iend = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  const idx = pngBuf.lastIndexOf(iend);
  if (idx < 0) throw new Error("PNG IEND not found");
  const data = Buffer.concat([Buffer.from(key, "latin1"), Buffer.from([0]), Buffer.from(value, "latin1")]);
  const type = Buffer.from("tEXt");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([type, data])));
  const chunk = Buffer.concat([len, type, data, crc]);
  return Buffer.concat([pngBuf.subarray(0, idx), chunk, pngBuf.subarray(idx)]);
}

if (tag && existsSync(outPng)) {
  const stamp = `shield-stamp: ${tag}${runId ? ` run ${runId}` : ""}`;
  const stamped = injectPngText(readFileSync(outPng), "Comment", stamp);
  writeFileSync(outPng, stamped);
  if (!stamped.includes(Buffer.from(tag, "latin1"))) {
    throw new Error(`export-home-continue-png: PNG tEXt missing stamp tag "${tag}"`);
  }
  // Still ends with IEND — valid PNG.
  if (!stamped.subarray(-12).equals(Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]))) {
    throw new Error("export-home-continue-png: PNG IEND missing after tEXt inject");
  }
  console.log(`export-home-continue-png: PNG tEXt stamp ok (${tag})`);
} else if (tag && !existsSync(outPng)) {
  throw new Error("export-home-continue-png: SHIELD_RELEASE_TAG set but PNG was not written");
}

void pathToFileURL;