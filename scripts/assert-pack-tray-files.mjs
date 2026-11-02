/**
 * Assert tray icon files exist under a pack/install assets dir.
 * Single source: shared/desktop-tray-icons.json (same list as pack-tray smoke).
 *
 *   node scripts/assert-pack-tray-files.mjs /usr/lib/preventive-shield/assets
 *   SHIELD_PACK_TRAY_ROOT=/usr/lib/preventive-shield node scripts/assert-pack-tray-files.mjs ./staged/assets
 *     → checks both argv dir and $SHIELD_PACK_TRAY_ROOT/assets when both are set
 */

import { access } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Repo root (not cwd) — CI runs this after `cd desktop-app`.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const icons = JSON.parse(readFileSync(path.join(root, "shared/desktop-tray-icons.json"), "utf8"));
if (!Array.isArray(icons) || icons.length < 1) {
  console.error("shared/desktop-tray-icons.json must be a non-empty array");
  process.exit(1);
}

const argvDir = process.argv[2] ? path.resolve(process.argv[2]) : null;
const packRoot = process.env.SHIELD_PACK_TRAY_ROOT
  ? path.resolve(process.env.SHIELD_PACK_TRAY_ROOT)
  : null;

const dirs = [];
if (argvDir) dirs.push({ label: "argv", dir: argvDir });
if (packRoot) {
  const assets = path.join(packRoot, "assets");
  // Avoid double-check when argv already points at the same assets dir.
  if (!argvDir || path.resolve(argvDir) !== path.resolve(assets)) {
    dirs.push({ label: "SHIELD_PACK_TRAY_ROOT", dir: assets });
  }
}

if (dirs.length === 0) {
  console.error(
    "usage: node scripts/assert-pack-tray-files.mjs <assets-dir>\n" +
      "  (optional) SHIELD_PACK_TRAY_ROOT=<pack-root> also asserts <pack-root>/assets"
  );
  process.exit(1);
}

async function assertDir(label, dir) {
  if (!existsSync(dir)) {
    console.error(`${label} assets dir missing: ${dir}`);
    process.exit(1);
  }
  for (const name of icons) {
    const file = path.join(dir, name);
    try {
      await access(file);
    } catch {
      console.error(`${label}: missing ${name} under ${dir}`);
      process.exit(1);
    }
  }
  console.log(`ok tray icons (${icons.join(", ")}) under ${dir} [${label}]`);
}

for (const { label, dir } of dirs) {
  await assertDir(label, dir);
}