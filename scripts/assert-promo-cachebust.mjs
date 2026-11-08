/**
 * Rebuild promo posters and fail if public/promo/.cachebust (or key artifacts) drift.
 * Run after typecheck in CI: npm run assert:promo-cachebust
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const promoPublic = path.join(root, "public/promo");
const wordmark = path.join(root, "public/brand/buusdo-wordmark-on-light.png");

const before = fs.existsSync(path.join(promoPublic, ".cachebust"))
  ? fs.readFileSync(path.join(promoPublic, ".cachebust"), "utf8").trim()
  : "";

const run = spawnSync(
  process.execPath,
  ["--import", "tsx", path.join(root, "scripts/build-promo-posters.mjs")],
  {
    cwd: root,
    encoding: "utf8",
  },
);
if (run.status !== 0) {
  console.error(run.stderr || run.stdout || "build-promo-posters failed");
  process.exit(run.status || 1);
}

const after = fs.readFileSync(path.join(promoPublic, ".cachebust"), "utf8").trim();
const expected = createHash("sha256").update(fs.readFileSync(wordmark)).digest("hex").slice(0, 10);

if (after !== expected) {
  console.error(`[assert-promo-cachebust] .cachebust=${after} ≠ wordmark sha ${expected}`);
  process.exit(1);
}

const poster = fs.readFileSync(path.join(promoPublic, "poster.html"), "utf8");
if (!poster.includes(`?v=${after}`)) {
  console.error(`[assert-promo-cachebust] poster.html missing ?v=${after}`);
  process.exit(1);
}
if (!poster.includes("product-qr.svg") || !poster.includes("china-qr.svg")) {
  console.error("[assert-promo-cachebust] poster.html missing live + china QR");
  process.exit(1);
}
if (!/lang="en"/.test(poster) || !/lang="pt-PT"/.test(poster) || !/lang="zh-Hans"/.test(poster)) {
  console.error("[assert-promo-cachebust] poster.html must include EN + pt-PT + zh-Hans panes");
  process.exit(1);
}

for (const name of [
  "poster.html",
  "china-qr.svg",
  "product-qr.svg",
  "buusdo-wordmark-on-light.png",
]) {
  if (!fs.existsSync(path.join(promoPublic, name))) {
    console.error(`[assert-promo-cachebust] missing public/promo/${name}`);
    process.exit(1);
  }
}

if (before && before !== after) {
  console.info(`[assert-promo-cachebust] cachebust updated ${before} → ${after} (committed rebuild)`);
}

console.info(`[assert-promo-cachebust] OK v=${after}`);
