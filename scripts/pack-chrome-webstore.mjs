#!/usr/bin/env node
/**
 * Build a Chrome Web Store zip from extension/ (MV3).
 *
 *   npm run pack:chrome-store
 *
 * Output: dist/chrome-webstore/buusdo-cybersecurity-service-tool-<version>.zip
 * Strips localhost host_permissions and README for the store package.
 * Dev Load unpacked still uses the live extension/ folder unchanged.
 */
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync
} from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const src = join(root, "extension");
const outDir = join(root, "dist", "chrome-webstore");
const stage = join(outDir, "package");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

const copy = [
  "manifest.json",
  "background",
  "popup",
  "content",
  "shared",
  "rules",
  "icons" // includes buusdo-wordmark.png + icon16/48/128
];

for (const name of copy) {
  const from = join(src, name);
  if (!existsSync(from)) {
    console.error(`[pack:chrome-store] missing ${name}`);
    process.exit(1);
  }
  cpSync(from, join(stage, name), { recursive: true });
}

const stores = JSON.parse(
  readFileSync(join(root, "shared", "extension-stores.json"), "utf8")
);
const manifestPath = join(stage, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

manifest.homepage_url = stores.supportHomepageUrl || "https://buusdocst.mtsu.workers.dev";
if (stores.privacyPolicyUrl) {
  // Chrome Web Store listing also needs the URL; keep in description for reviewers.
  manifest.description = String(manifest.description || "").slice(0, 132);
}

// Store package: keep production workers.dev host; drop localhost-only entries.
const hosts = Array.isArray(manifest.host_permissions)
  ? manifest.host_permissions
  : [];
manifest.host_permissions = hosts.filter(
  (h) => !/localhost|127\.0\.0\.1/i.test(String(h))
);
if (!manifest.host_permissions.some((h) => /buusdocst\.mtsu\.workers\.dev/i.test(String(h)))) {
  console.error("[pack:chrome-store] production host_permissions missing — run production:origin");
  process.exit(1);
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const version = String(manifest.version || "0.0.0");
const zipName = `buusdo-cybersecurity-service-tool-${version}.zip`;
const zipPath = join(outDir, zipName);

execFileSync("zip", ["-r", "-q", zipPath, "."], { cwd: stage, stdio: "inherit" });

// Listing shot bundle (not inside the extension zip) — Halt + Clear/Hold shot 2 pair.
const shotDir = join(outDir, "listing-screenshots");
mkdirSync(shotDir, { recursive: true });
const frames = [
  "FRAME-formal-name.png",
  "FRAME-clear.png",
  "FRAME-hold.png",
];
for (const name of frames) {
  const from = join(root, "docs", "store-screenshots", name);
  if (!existsSync(from)) {
    console.error(`[pack:chrome-store] missing store FRAME ${name} — run npm run capture:store-halt-frame`);
    process.exit(1);
  }
  cpSync(from, join(shotDir, name));
}
{
  const draft = readFileSync(join(root, "docs", "CHROME_STORE_LISTING_DRAFT.md"), "utf8");
  const chunk =
    draft.split("## Screenshot captions")[1]?.split("## Privacy policy URL")[0]?.trim() ||
    "See docs/CHROME_STORE_LISTING_DRAFT.md";
  writeFileSync(join(shotDir, "CAPTIONS.txt"), `${chunk}\n`, "utf8");
  writeFileSync(
    join(shotDir, "README.txt"),
    [
      "Chrome Web Store listing screenshots (upload order)",
      "1. FRAME-formal-name.png  — Halt",
      "2. FRAME-clear.png + FRAME-hold.png — Clear / Hold pair",
      "Captions: CAPTIONS.txt (from docs/CHROME_STORE_LISTING_DRAFT.md)",
      "Rebuild: npm run capture:store-halt-frame && npm run pack:chrome-store",
      "",
    ].join("\n"),
    "utf8",
  );
}

// Companion zip for dashboard upload (extension zip must stay MV3-clean).
const listingZipName = `buusdo-cybersecurity-service-tool-${version}-listing-frames.zip`;
const listingZipPath = join(outDir, listingZipName);
execFileSync("zip", ["-r", "-q", listingZipPath, "."], { cwd: shotDir, stdio: "inherit" });

console.info(`[pack:chrome-store] OK ${zipPath}`);
console.info(`[pack:chrome-store] listing shots → ${shotDir}`);
console.info(`[pack:chrome-store] listing FRAME zip → ${listingZipPath} (3 FRAMEs + captions)`);
console.info(
  "[pack:chrome-store] Upload in Chrome Web Store Developer Dashboard → new item / package"
);
console.info(
  `[pack:chrome-store] After publish, set chromeWebStoreUrl in shared/extension-stores.json`
);