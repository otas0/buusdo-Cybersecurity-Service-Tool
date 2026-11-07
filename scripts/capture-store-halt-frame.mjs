/**
 * Capture Chrome store Halt FRAME (instrument dark field + formal name).
 * Sharp composite — no browser required. Prefer this in CI.
 *
 *   npm run capture:store-halt-frame
 *
 * Optional live capture: PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/store-halt-frame.spec.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BG = "#0e0e0e";
const TEXT = "#f3f1ea";
const MUTED = "#8d897f";
const HALT = "#ff4d00";
const W = 1280;
const H = 800;
const label = "buusdo Cybersecurity Service Tool";

const wordmark = await sharp(path.join(root, "public/brand/buusdo-wordmark.png"))
  .resize({ height: 40, withoutEnlargement: true })
  .png()
  .toBuffer();
const mark = await sharp(path.join(root, "public/brand/buusdo-mark-halt.svg"))
  .resize(14, 14)
  .png()
  .toBuffer();

const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="100%" height="100%" fill="${BG}"/>
  <line x1="40" y1="88" x2="${W - 40}" y2="88" stroke="rgba(243,241,234,0.16)" stroke-width="1"/>
  <text x="${W - 40}" y="58" text-anchor="end" fill="${MUTED}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="11" letter-spacing="2">EN</text>
  <text x="40" y="140" fill="${MUTED}" font-family="ui-monospace, SF Mono, Menlo, monospace" font-size="11" letter-spacing="2">RESULT</text>
  <text x="40" y="280" fill="${HALT}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="72" font-weight="450" letter-spacing="-2">Halt</text>
  <text x="40" y="340" fill="${TEXT}" font-family="ui-monospace, SF Mono, Menlo, monospace" font-size="14" letter-spacing="1">login-micros0ft-security.example</text>
  <text x="40" y="390" fill="${MUTED}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="18">Own threat list and brand-impersonation signals matched.</text>
  <text x="40" y="418" fill="${MUTED}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="18">Do not enter credentials.</text>
  <text x="40" y="${H - 36}" fill="${MUTED}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="16" font-weight="600">${label}</text>
</svg>`);

const out = path.join(root, "docs/store-screenshots/FRAME-formal-name.png");
await sharp(svg)
  .composite([
    { input: wordmark, left: 40, top: 28 },
    { input: mark, left: 40, top: 168 },
  ])
  .png()
  .toFile(out);

console.info(`[capture:store-halt-frame] OK ${out} (${fs.statSync(out).size} bytes)`);
