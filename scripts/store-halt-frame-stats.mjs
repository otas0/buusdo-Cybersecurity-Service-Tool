/**
 * Structural stats for Halt FRAME PNGs (Sharp vs Playwright cross-check floors).
 */
import sharp from "sharp";

/**
 * @param {string} pngPath
 * @returns {Promise<{ width: number, height: number, darkRatio: number, haltCount: number, bytes: number }>}
 */
export async function haltFrameStats(pngPath) {
  const { data, info } = await sharp(pngPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const total = width * height;
  let dark = 0;
  let halt = 0;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;
    if (r < 40 && g < 40 && b < 40) dark += 1;
    // Halt orange ~#ff4d00 (allow render variance)
    if (r > 180 && g < 130 && b < 90 && r > g + 40) halt += 1;
  }
  return {
    width,
    height,
    darkRatio: dark / total,
    haltCount: halt,
    bytes: total * channels,
  };
}

/**
 * Floors shared by Sharp committed FRAME and Playwright cross-check capture.
 * @param {{ width: number, height: number, darkRatio: number, haltCount: number }} stats
 * @param {string} label
 */
export function assertHaltFrameFloors(stats, label) {
  const fails = [];
  if (stats.width !== 1280 || stats.height !== 800) {
    fails.push(`${label} size ${stats.width}x${stats.height} ≠ 1280x800`);
  }
  if (stats.darkRatio < 0.55) {
    fails.push(`${label} darkRatio ${stats.darkRatio.toFixed(3)} < 0.55`);
  }
  if (stats.haltCount < 80) {
    fails.push(`${label} haltCount ${stats.haltCount} < 80`);
  }
  return fails;
}

/**
 * Relative floor between Sharp reference and Playwright capture.
 * @param {{ darkRatio: number, haltCount: number }} sharpStats
 * @param {{ darkRatio: number, haltCount: number }} pwStats
 */
export function assertHaltFrameRelativeFloor(sharpStats, pwStats) {
  const fails = [];
  const darkDelta = Math.abs(sharpStats.darkRatio - pwStats.darkRatio);
  if (darkDelta > 0.3) {
    fails.push(
      `darkRatio delta ${darkDelta.toFixed(3)} > 0.3 (sharp=${sharpStats.darkRatio.toFixed(3)} pw=${pwStats.darkRatio.toFixed(3)})`,
    );
  }
  // Playwright antialias may yield fewer pure Halt pixels — require at least 25% of Sharp count.
  const minHalt = Math.max(80, Math.floor(sharpStats.haltCount * 0.25));
  if (pwStats.haltCount < minHalt) {
    fails.push(
      `playwright haltCount ${pwStats.haltCount} < relative floor ${minHalt} (sharp=${sharpStats.haltCount})`,
    );
  }
  return fails;
}
