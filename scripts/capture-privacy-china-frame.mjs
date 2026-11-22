#!/usr/bin/env node
/**
 * Instrument FRAME for Workers privacy China section (no live CF required).
 *
 *   node scripts/capture-privacy-china-frame.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs/store-screenshots");
const BG = "#0e0e0e";
const TEXT = "#f3f1ea";
const MUTED = "#a39e93";
const HALT = "#ff4d00";
const W = 1280;
const H = 800;

const wordmark = await sharp(path.join(root, "public/brand/buusdo-wordmark.png"))
  .resize({ height: 40, withoutEnlargement: true })
  .png()
  .toBuffer();

const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${BG}"/>
  <rect x="64" y="120" width="8" height="28" fill="${HALT}"/>
  <text x="88" y="142" fill="${MUTED}" font-family="ui-monospace,Menlo,monospace" font-size="14" letter-spacing="2">PRIVACY · CHINA ENTRY</text>
  <text x="64" y="220" fill="${TEXT}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="36" font-weight="600">中国大陆入口（GitHub Pages）</text>
  <text x="64" y="270" fill="${MUTED}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="20">China mainland entry — notice + auto-guide</text>
  <text x="64" y="340" fill="${TEXT}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="18">otas0.github.io/buusdocst · privacy-china-notice</text>
  <text x="64" y="400" fill="${MUTED}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="16">buusdo Cybersecurity Service Tool</text>
  <text x="64" y="720" fill="${MUTED}" font-family="ui-monospace,Menlo,monospace" font-size="13">FRAME-privacy-china-notice · instrument reference</text>
</svg>`;

const base = await sharp(Buffer.from(svg)).png().toBuffer();
const out = path.join(outDir, "FRAME-privacy-china-notice.png");
await sharp(base)
  .composite([{ input: wordmark, left: 64, top: 48 }])
  .png()
  .toFile(out);

console.info(`wrote ${path.relative(root, out)}`);
