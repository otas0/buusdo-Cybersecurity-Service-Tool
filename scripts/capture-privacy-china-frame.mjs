#!/usr/bin/env node
/**
 * Instrument FRAMEs for Workers privacy China section (no live CF required).
 *
 *   node scripts/capture-privacy-china-frame.mjs
 *   → FRAME-privacy-china-notice.png (zh-Hans primary)
 *   → FRAME-privacy-china-notice-en.png (EN twin for /en/privacy#privacy-china-notice)
 */
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

async function writeFrame({ file, eyebrow, title, subtitle, footer }) {
  const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${BG}"/>
  <rect x="64" y="120" width="8" height="28" fill="${HALT}"/>
  <text x="88" y="142" fill="${MUTED}" font-family="ui-monospace,Menlo,monospace" font-size="14" letter-spacing="2">${eyebrow}</text>
  <text x="64" y="220" fill="${TEXT}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="36" font-weight="600">${title}</text>
  <text x="64" y="270" fill="${MUTED}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="20">${subtitle}</text>
  <text x="64" y="340" fill="${TEXT}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="18">otas0.github.io/buusdocst · privacy-china-notice</text>
  <text x="64" y="400" fill="${MUTED}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="16">buusdo Cybersecurity Service Tool</text>
  <text x="64" y="720" fill="${MUTED}" font-family="ui-monospace,Menlo,monospace" font-size="13">${footer}</text>
</svg>`;
  const base = await sharp(Buffer.from(svg)).png().toBuffer();
  const out = path.join(outDir, file);
  await sharp(base)
    .composite([{ input: wordmark, left: 64, top: 48 }])
    .png()
    .toFile(out);
  console.info(`wrote ${path.relative(root, out)}`);
}

await writeFrame({
  file: "FRAME-privacy-china-notice.png",
  eyebrow: "PRIVACY · CHINA ENTRY",
  title: "中国大陆入口（GitHub Pages）",
  subtitle: "China mainland entry — notice + auto-guide",
  footer: "FRAME-privacy-china-notice · instrument reference"
});

await writeFrame({
  file: "FRAME-privacy-china-notice-en.png",
  eyebrow: "PRIVACY · CHINA ENTRY · EN",
  title: "China mainland entry (GitHub Pages)",
  subtitle: "/en/privacy#privacy-china-notice — notice + auto-guide",
  footer: "FRAME-privacy-china-notice-en · instrument reference"
});
