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
