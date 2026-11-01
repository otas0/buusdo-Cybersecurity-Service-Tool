#!/usr/bin/env node
/**
 * Write a max-width PNG thumbnail using Playwright Chromium (no ImageMagick).
 * Usage: node scripts/png-max-width.mjs <input.png> <output.png> [maxWidth=400]
 */
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

async function main() {
  const input = resolve(process.argv[2] || "");
  const output = resolve(process.argv[3] || "");
  const maxWidth = Math.max(64, Number(process.argv[4] || 400) || 400);
  if (!input || !output) {
    console.error("Usage: node scripts/png-max-width.mjs <input.png> <output.png> [maxWidth]");
    process.exit(2);
  }

  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch {
    console.error("playwright not installed — skip thumb");
    process.exit(0);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const fileUrl = pathToFileURL(input).href;
    await page.setContent(
      `<!doctype html><html><body style="margin:0;background:#000">
        <img id="i" src="${fileUrl}" style="display:block;max-width:${maxWidth}px;height:auto" />
      </body></html>`,
      { waitUntil: "load" }
    );
    const img = page.locator("#i");
    await img.waitFor({ state: "visible" });
    const box = await img.boundingBox();
    if (!box) throw new Error("no image box");
    await page.screenshot({
      path: output,
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
      type: "png"
    });
    console.log(`thumb ${output} (${Math.round(box.width)}x${Math.round(box.height)})`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});