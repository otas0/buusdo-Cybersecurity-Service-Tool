/**
 * Copy shared/desktop-downloads.json (incl. minSupportedVersion) into any local
 * desktop-app/dist .../Resources/shared/ trees without a full pack rebuild.
 *
 *   node scripts/sync-desktop-dist-downloads.mjs
 *   node scripts/sync-desktop-dist-downloads.mjs --check
 */
import { cpSync, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "shared/desktop-downloads.json");
const checkOnly = process.argv.includes("--check");
const distRoot = path.join(root, "desktop-app/dist");

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, out);
    else if (name === "desktop-downloads.json" && p.includes(`${path.sep}shared${path.sep}`)) {
      out.push(p);
    }
  }
  return out;
}

if (!existsSync(src)) {
  console.error("[sync-desktop-dist-downloads] missing shared/desktop-downloads.json");
  process.exit(1);
}

const srcJson = JSON.parse(readFileSync(src, "utf8"));
const srcMin = String(srcJson.minSupportedVersion || "").trim();
if (!/^\d+\.\d+\.\d+/.test(srcMin)) {
  console.error(`[sync-desktop-dist-downloads] invalid minSupportedVersion: ${srcMin}`);
  process.exit(1);
}

const targets = walk(distRoot);
if (!targets.length) {
  console.info("[sync-desktop-dist-downloads] no dist shared/desktop-downloads.json — skip (pack first)");
  process.exit(0);
}

let drift = 0;
for (const dest of targets) {
  const cur = existsSync(dest) ? JSON.parse(readFileSync(dest, "utf8")) : {};
  const curMin = String(cur.minSupportedVersion || "").trim();
  if (curMin === srcMin && cur.minSupportedBumpReason === srcJson.minSupportedBumpReason) {
    console.info(`[sync-desktop-dist-downloads] ok ${path.relative(root, dest)} min=${srcMin}`);
    continue;
  }
  drift += 1;
  if (checkOnly) {
    console.error(
      `[sync-desktop-dist-downloads] drift ${path.relative(root, dest)} have=${curMin || "(missing)"} want=${srcMin}`
    );
    continue;
  }
  cpSync(src, dest);
  console.info(`[sync-desktop-dist-downloads] synced ${path.relative(root, dest)} → min=${srcMin}`);
}

if (checkOnly && drift) process.exit(1);
