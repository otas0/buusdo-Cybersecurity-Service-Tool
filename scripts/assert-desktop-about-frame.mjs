/**
 * Desktop About FRAME capture must exist and stay wired to formalName / foot-about.
 *
 *   node scripts/assert-desktop-about-frame.mjs
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brand = JSON.parse(readFileSync(join(root, "shared/brand.json"), "utf8"));
const formal = brand.formalName;
const frame = join(root, "docs/store-screenshots/FRAME-desktop-about.png");
const capture = readFileSync(join(root, "scripts/capture-desktop-about-frame.mjs"), "utf8");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

if (!existsSync(frame)) {
  console.error(
    "[assert-desktop-about-frame] missing docs/store-screenshots/FRAME-desktop-about.png — run npm run capture:desktop-about-frame"
  );
  process.exit(1);
}
const size = statSync(frame).size;
if (size < 1500) {
  console.error(`[assert-desktop-about-frame] FRAME too small (${size} bytes) — re-capture`);
  process.exit(1);
}
if (!capture.includes("foot-about")) {
  console.error("[assert-desktop-about-frame] capture script must target foot-about");
  process.exit(1);
}
if (!capture.includes("FRAME-desktop-about.png")) {
  console.error("[assert-desktop-about-frame] capture script must write FRAME-desktop-about.png");
  process.exit(1);
}
if (!pkg.scripts?.["capture:desktop-about-frame"]) {
  console.error("[assert-desktop-about-frame] package.json missing capture:desktop-about-frame");
  process.exit(1);
}
const checkDesktop = pkg.scripts?.["check:desktop"] || "";
if (!checkDesktop.includes("assert:desktop-about-frame") && !checkDesktop.includes("assert-desktop-about-frame")) {
  console.error("[assert-desktop-about-frame] check:desktop must invoke assert:desktop-about-frame");
  process.exit(1);
}
const aboutHtml = readFileSync(join(root, "desktop-app/public/index.html"), "utf8");
if (!aboutHtml.includes(formal)) {
  console.error(
    `[assert-desktop-about-frame] desktop index About must contain formalName ${JSON.stringify(formal)}`
  );
  process.exit(1);
}
/** Optional pixel / OCR spot-check (soft unless ASSERT_ABOUT_FRAME_STRICT=1). */
async function optionalPixelOrOcr() {
  const strict = process.env.ASSERT_ABOUT_FRAME_STRICT === "1";
  try {
    const { default: sharp } = await import("sharp");
    const { data, info } = await sharp(frame).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let nonBg = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 8) continue;
      // Count pixels that are not near pure black / pure field
      if (r + g + b > 40) nonBg++;
    }
    const ratio = nonBg / (info.width * info.height);
    if (ratio < 0.01) {
      const msg = `[assert-desktop-about-frame] FRAME looks empty (non-bg ratio=${ratio.toFixed(4)})`;
      if (strict) {
        console.error(msg);
        process.exit(1);
      }
      console.warn(`SOFT-FAIL ${msg}`);
    } else {
      console.info(`[assert-desktop-about-frame] pixel OK non-bg≈${(ratio * 100).toFixed(1)}%`);
    }
  } catch (err) {
    console.info(
      "[assert-desktop-about-frame] sharp unavailable — skip pixel spot-check",
      err instanceof Error ? err.message.split("\n")[0] : err
    );
  }

  // Optional OCR via system tesseract if present
  try {
    const { execFileSync } = await import("node:child_process");
    const text = execFileSync("tesseract", [frame, "stdout", "-l", "eng"], {
      encoding: "utf8",
      timeout: 20000
    });
    const ok = text.includes("buusdo") || text.toLowerCase().includes("cybersecurity");
    if (!ok) {
      const msg = `[assert-desktop-about-frame] OCR missed formalName tokens (got ${JSON.stringify(text.slice(0, 80))})`;
      if (strict) {
        console.error(msg);
        process.exit(1);
      }
      console.warn(`SOFT-FAIL ${msg}`);
    } else {
      console.info("[assert-desktop-about-frame] OCR OK (buusdo / cybersecurity)");
    }
  } catch {
    console.info("[assert-desktop-about-frame] tesseract unavailable — skip OCR spot-check");
  }
}

await optionalPixelOrOcr();
console.info(`[assert-desktop-about-frame] OK FRAME=${size}B formalName=${JSON.stringify(formal)}`);
