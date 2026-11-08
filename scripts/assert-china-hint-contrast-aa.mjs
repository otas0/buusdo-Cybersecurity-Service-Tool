#!/usr/bin/env node
/**
 * China Pages .hint / .hint-dismiss must meet AA (≥4.5:1) on --bg.
 *
 *   node scripts/assert-china-hint-contrast-aa.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const tokens = readFileSync(path.join(root, "china-pages/assets/tokens.css"), "utf8");
const css = readFileSync(path.join(root, "china-pages/styles.css"), "utf8");

function hexToRgb(hex) {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = Number.parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function lin(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance({ r, g, b }) {
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a, b) {
  const L1 = luminance(a);
  const L2 = luminance(b);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

const bgMatch = tokens.match(/--bg:\s*(#[0-9a-fA-F]{3,8})/);
if (!bgMatch) {
  console.error("FAIL: --bg missing in china-pages/assets/tokens.css");
  process.exit(1);
}
const bg = hexToRgb(bgMatch[1]);

const hintMatch = css.match(/\.shell\s+\.stage\s+p\.hint\s*\{[^}]*color:\s*(#[0-9a-fA-F]{3,8}|var\(--muted\))/s);
const dismissMatch = css.match(/\.shell\s+\.hint-dismiss\s*\{[^}]*color:\s*(#[0-9a-fA-F]{3,8})/s);

if (!dismissMatch) {
  console.error("FAIL: .hint-dismiss must set an explicit hex color (AA on --bg)");
  process.exit(1);
}

const mutedMatch = tokens.match(/--muted:\s*(#[0-9a-fA-F]{3,8})/);
const hintHex = hintMatch?.[1]?.startsWith("#")
  ? hintMatch[1]
  : mutedMatch?.[1];
if (!hintHex) {
  console.error("FAIL: cannot resolve .hint color");
  process.exit(1);
}

for (const [name, hex] of [
  [".hint", hintHex],
  [".hint-dismiss", dismissMatch[1]]
]) {
  const ratio = contrast(hexToRgb(hex), bg);
  if (ratio < 4.5) {
    console.error(`FAIL: ${name} ${hex} on ${bgMatch[1]} contrast ${ratio.toFixed(2)} < 4.5`);
    process.exit(1);
  }
  console.info(`ok ${name} ${hex} contrast ${ratio.toFixed(2)}`);
}
console.info("assert-china-hint-contrast-aa ok");
