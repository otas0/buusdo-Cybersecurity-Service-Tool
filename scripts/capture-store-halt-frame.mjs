/**
 * Capture Chrome store readout FRAMEs (Halt / Clear / Hold).
 * Sharp composite — no browser required.
 *
 *   npm run capture:store-halt-frame
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
const outDir = path.join(root, "docs/store-screenshots");

const wordmark = await sharp(path.join(root, "public/brand/buusdo-wordmark.png"))
  .resize({ height: 40, withoutEnlargement: true })
  .png()
  .toBuffer();

async function markPng(level) {
  if (level === "danger") {
    return sharp(path.join(root, "public/brand/buusdo-mark-halt.svg"))
      .resize(14, 14)
      .png()
      .toBuffer();
  }
  // cream square mark for Clear / Hold (matches instrument .readout .mark)
  return sharp({
    create: {
      width: 14,
      height: 14,
      channels: 4,
      background: { r: 243, g: 241, b: 234, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

const frames = [
  {
    file: "FRAME-formal-name.png",
    word: "Halt",
    wordColor: HALT,
    host: "login-micros0ft-security.example",
    lines: [
      "Own threat list and brand-impersonation signals matched.",
      "Do not enter credentials.",
    ],
    level: "danger",
  },
  {
    file: "FRAME-clear.png",
    word: "Clear",
    wordColor: TEXT,
    host: "example.com",
    lines: [
      "No strong first-party threat signals on this address.",
      "Still decide carefully before you enter sensitive data.",
    ],
    level: "safe",
  },
  {
    file: "FRAME-hold.png",
    word: "Hold",
    wordColor: TEXT,
    host: "paypa1-secure-login.example",
    lines: [
      "Mixed or incomplete signals — do not rush.",
      "Confirm the address before you continue.",
    ],
    level: "caution",
  },
];

for (const frame of frames) {
  const mark = await markPng(frame.level);
  const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="100%" height="100%" fill="${BG}"/>
  <line x1="40" y1="88" x2="${W - 40}" y2="88" stroke="rgba(243,241,234,0.16)" stroke-width="1"/>
  <text x="${W - 40}" y="58" text-anchor="end" fill="${MUTED}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="11" letter-spacing="2">EN</text>
  <text x="40" y="140" fill="${MUTED}" font-family="ui-monospace, SF Mono, Menlo, monospace" font-size="11" letter-spacing="2">RESULT</text>
  <text x="40" y="280" fill="${frame.wordColor}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="72" font-weight="450" letter-spacing="-2">${frame.word}</text>
  <text x="40" y="340" fill="${TEXT}" font-family="ui-monospace, SF Mono, Menlo, monospace" font-size="14" letter-spacing="1">${frame.host}</text>
  <text x="40" y="390" fill="${MUTED}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="18">${frame.lines[0]}</text>
  <text x="40" y="418" fill="${MUTED}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="18">${frame.lines[1]}</text>
  <text x="40" y="${H - 36}" fill="${MUTED}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="16" font-weight="600">${label}</text>
</svg>`);

  const out = path.join(outDir, frame.file);
  await sharp(svg)
    .composite([
      { input: wordmark, left: 40, top: 28 },
      { input: mark, left: 40, top: 168 },
    ])
    .png()
    .toFile(out);
  console.info(`[capture:store-halt-frame] OK ${frame.file} (${fs.statSync(out).size} bytes)`);
}
