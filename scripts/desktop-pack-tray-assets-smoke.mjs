/**
 * Assert tray icon assets ship with packaging trees (.app / NSIS stage / .deb).
 *
 *   npm run smoke:desktop-pack-tray-assets
 */

import { existsSync, readFileSync } from "node:fs";
import { readdir, access } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(".");
const root = path.resolve("desktop-app");
// Single source with CI post-dpkg asserts — shared/desktop-tray-icons.json
const required = JSON.parse(
  readFileSync(path.join(repoRoot, "shared/desktop-tray-icons.json"), "utf8")
);
if (!Array.isArray(required) || required.length < 1) {
  throw new Error("shared/desktop-tray-icons.json must be a non-empty array");
}

function fail(message) {
  throw new Error(message);
}

async function assertDirHasIcons(label, dir) {
  if (!existsSync(dir)) {
    console.log(`skip ${label} (tree absent): ${dir}`);
    return false;
  }
  for (const name of required) {
    const file = path.join(dir, name);
    try {
      await access(file);
    } catch {
      fail(`${label} missing ${name} under ${dir}`);
    }
  }
  console.log(`ok ${label}: ${required.join(", ")}`);
  return true;
}

const sourceAssets = path.join(root, "assets");
await assertDirHasIcons("source assets", sourceAssets);

const packRoot = process.env.SHIELD_PACK_TRAY_ROOT
  ? path.resolve(process.env.SHIELD_PACK_TRAY_ROOT)
  : null;
if (packRoot) {
  // Includes tray-icon-template.png — same list as CI post-dpkg asserts.
  await assertDirHasIcons(`SHIELD_PACK_TRAY_ROOT (${packRoot})`, path.join(packRoot, "assets"));
}


const trees = [
  ["macos .app", path.join(root, "dist/macos/Preventive Shield.app/Contents/Resources/app/assets")],
  ["windows NSIS stage", path.join(root, "packaging/windows/stage/app/assets")],
  ["linux deb stage amd64", path.join(root, "dist/linux/preventive-shield_0.2.0_amd64/usr/lib/preventive-shield/assets")],
  ["linux deb stage arm64", path.join(root, "dist/linux/preventive-shield_0.2.0_arm64/usr/lib/preventive-shield/assets")]
];

let checked = 0;
for (const [label, dir] of trees) {
  if (await assertDirHasIcons(label, dir)) checked += 1;
}

// Packaging scripts must not exclude assets/
const scripts = [
  path.join(root, "packaging/macos/build-app.sh"),
  path.join(root, "packaging/windows/stage-nsis.sh"),
  path.join(root, "packaging/linux/build-deb.sh")
];
for (const script of scripts) {
  const text = await (await import("node:fs/promises")).readFile(script, "utf8");
  if (/--exclude\s+assets\b/.test(text) || /--exclude=['"]assets/.test(text)) {
    fail(`${path.basename(script)} excludes assets/`);
  }
}
console.log("ok packaging scripts do not exclude assets/");

if (checked === 0) {
  console.log(
    "note: no packaged trees present yet — source assets verified; run pack:macos / pack:windows-stage / pack:linux to exercise install trees"
  );
}

const listing = await readdir(sourceAssets);
if (!required.every((n) => listing.includes(n))) fail("source assets incomplete");
console.log("desktop pack tray assets smoke ok");