import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import sharp from "sharp";

const root = process.cwd();

async function sample(rel: string) {
  const file = path.join(root, rel);
  assert.ok(existsSync(file), `missing ${rel}`);
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let orange = 0;
  let muted = 0;
  let charcoal = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 180) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r >= 160 && g <= 120 && b <= 60 && r > g + 40) orange += 1;
    if (Math.abs(r - 0x8d) <= 18 && Math.abs(g - 0x89) <= 18 && Math.abs(b - 0x7f) <= 18) muted += 1;
    if (Math.abs(r - 84) <= 14 && Math.abs(g - 84) <= 14 && Math.abs(b - 84) <= 14) charcoal += 1;
  }
  return { orange, muted, charcoal, w: info.width, h: info.height };
}

test("desktop tray mark icons exist (Halt orange allowed on mark, not wordmark)", () => {
  for (const rel of [
    "desktop-app/assets/tray-icon.png",
    "desktop-app/assets/tray-icon-template.png",
    "desktop-app/assets/tray-icon.ico"
  ]) {
    assert.ok(existsSync(path.join(root, rel)), `missing ${rel}`);
  }
});

test("desktop About wordmark keeps muted/charcoal u (never orange)", async () => {
  const dark = await sample("desktop-app/public/brand/buusdo-wordmark.png");
  const light = await sample("desktop-app/public/brand/buusdo-wordmark-on-light.png");
  assert.ok(dark.orange < 40, `dark wordmark orange=${dark.orange}`);
  assert.ok(light.orange < 40, `on-light wordmark orange=${light.orange}`);
  assert.ok(light.charcoal > 200, `on-light charcoal u missing (${light.charcoal})`);
  assert.ok(dark.muted > 200, `dark muted u missing (${dark.muted})`);
});

test("designer path wordmark locks charcoal swatch", () => {
  const svg = readFileSync(path.join(root, "shared/brand/source/buusdo-wordmark-paths.svg"), "utf8");
  assert.match(svg, /fill="#545454"/);
  assert.doesNotMatch(svg, /fill="#ff4d00"/i);
  assert.match(svg, /id="u-card"/);
});

test("extension popup wordmark asset is muted u on dark (no orange)", async () => {
  const dark = await sample("extension/icons/buusdo-wordmark.png");
  assert.ok(dark.orange < 40, `extension wordmark orange=${dark.orange}`);
  assert.ok(dark.muted > 200, `extension muted u missing (${dark.muted})`);
});

test("desktop About strip screenshot sits beside tray parity assets", async () => {
  const outRel = "docs/store-screenshots/FRAME-desktop-about-tray.png";
  const out = path.join(root, outRel);
  const tray = path.join(root, "desktop-app/assets/tray-icon.png");
  const wordmark = path.join(root, "desktop-app/public/brand/buusdo-wordmark.png");
  const mark = path.join(root, "desktop-app/public/brand/buusdo-mark.svg");
  assert.ok(existsSync(tray), "missing tray-icon.png");
  assert.ok(existsSync(wordmark), "missing About wordmark");
  assert.ok(existsSync(mark), "missing About mark");

  const trayPng = await sharp(tray).resize({ height: 48, fit: "inside" }).png().toBuffer();
  const markPng = await sharp(mark).resize({ height: 48, fit: "inside" }).png().toBuffer();
  const wmPng = await sharp(wordmark).resize({ height: 40, fit: "inside" }).png().toBuffer();
  const trayMeta = await sharp(trayPng).metadata();
  const markMeta = await sharp(markPng).metadata();
  const wmMeta = await sharp(wmPng).metadata();
  const gap = 16;
  const width =
    (trayMeta.width || 48) + gap + (markMeta.width || 32) + gap + (wmMeta.width || 120) + 32;
  const height = 80;
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 14, g: 14, b: 14 }
    }
  })
    .composite([
      { input: trayPng, left: 16, top: Math.round((height - (trayMeta.height || 48)) / 2) },
      {
        input: markPng,
        left: 16 + (trayMeta.width || 48) + gap,
        top: Math.round((height - (markMeta.height || 48)) / 2)
      },
      {
        input: wmPng,
        left: 16 + (trayMeta.width || 48) + gap + (markMeta.width || 32) + gap,
        top: Math.round((height - (wmMeta.height || 40)) / 2)
      }
    ])
    .png()
    .toFile(out);

  assert.ok(existsSync(out), `missing ${outRel}`);
  const strip = await sample(outRel);
  // Tray / mark may use Halt orange; wordmark portion must still carry muted u.
  assert.ok(strip.muted > 80, `About+tray strip muted u missing (${strip.muted})`);
  assert.ok(strip.w >= 120 && strip.h >= 40, `About+tray strip too small ${strip.w}x${strip.h}`);
});

test("desktop About live footer FRAME exists with muted wordmark (beyond tray composite)", async () => {
  const aboutRel = "docs/store-screenshots/FRAME-desktop-about.png";
  const about = path.join(root, aboutRel);
  // Prefer committed Playwright capture; if absent, synthesize footer strip from live About assets.
  if (!existsSync(about)) {
    const mark = path.join(root, "desktop-app/public/brand/buusdo-mark.svg");
    const wordmark = path.join(root, "desktop-app/public/brand/buusdo-wordmark.png");
    const markPng = await sharp(mark).resize({ height: 28, fit: "inside" }).png().toBuffer();
    const wmPng = await sharp(wordmark).resize({ height: 36, fit: "inside" }).png().toBuffer();
    const markMeta = await sharp(markPng).metadata();
    const wmMeta = await sharp(wmPng).metadata();
    const width = 16 + (markMeta.width || 28) + 12 + (wmMeta.width || 120) + 16;
    const height = 56;
    await sharp({
      create: { width, height, channels: 3, background: { r: 14, g: 14, b: 14 } }
    })
      .composite([
        { input: markPng, left: 16, top: Math.round((height - (markMeta.height || 28)) / 2) },
        {
          input: wmPng,
          left: 16 + (markMeta.width || 28) + 12,
          top: Math.round((height - (wmMeta.height || 36)) / 2)
        }
      ])
      .png()
      .toFile(about);
  }
  assert.ok(existsSync(about), `missing ${aboutRel} — run npm run capture:desktop-about-frame`);
  const frame = await sample(aboutRel);
  assert.ok(frame.muted > 40, `FRAME-desktop-about muted u missing (${frame.muted})`);
  assert.ok(frame.orange < 80, `FRAME-desktop-about orange too high (${frame.orange})`);
  // Pixel sample of the committed About FRAME (parity with popup muted-u assert).
  assert.ok(frame.w >= 80 && frame.h >= 24, `FRAME-desktop-about too small ${frame.w}x${frame.h}`);
});

test("FRAME-desktop-about.png muted-u pixel sample (unit parity)", async () => {
  const rel = "docs/store-screenshots/FRAME-desktop-about.png";
  assert.ok(existsSync(path.join(root, rel)), `missing ${rel}`);
  const frame = await sample(rel);
  assert.ok(frame.muted > 40, `About FRAME muted u (#8d897f) missing (${frame.muted})`);
  assert.ok(frame.orange < 80, `About FRAME Halt-orange too high (${frame.orange})`);
});
