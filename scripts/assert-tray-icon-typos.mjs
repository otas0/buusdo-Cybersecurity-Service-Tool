/**
 * Fail if assets/ has tray-looking filenames not listed in shared/desktop-tray-icons.json.
 * Scans the assets dir and one nested level (e.g. assets/extra/icon-tray.png).
 *
 *   node scripts/assert-tray-icon-typos.mjs <assets-dir>
 */

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const assetsDir = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!assetsDir) {
  console.error("usage: node scripts/assert-tray-icon-typos.mjs <assets-dir>");
  process.exit(1);
}
if (!existsSync(assetsDir)) {
  console.error(`assets dir missing: ${assetsDir}`);
  process.exit(1);
}

const expected = JSON.parse(
  readFileSync(path.join(root, "shared/desktop-tray-icons.json"), "utf8")
);
if (!Array.isArray(expected) || expected.length < 1) {
  console.error("shared/desktop-tray-icons.json must be a non-empty array");
  process.exit(1);
}
const expectedSet = new Set(expected);

/** Case-insensitive match for *tray*, tray*, or icon-tray* basenames (skip docs/json). */
function isTrayLookingName(name) {
  const lower = name.toLowerCase();
  // Ignore docs/json that merely contain "tray" if co-located under assets.
  if (
    lower.endsWith(".json") ||
    lower.endsWith(".md") ||
    lower.endsWith(".markdown") ||
    lower.endsWith(".rst") ||
    lower.endsWith(".adoc") ||
    lower.endsWith(".txt")
  ) {
    return false;
  }
  return lower.includes("tray") || lower.startsWith("tray") || lower.startsWith("icon-tray");
}

/** Collect tray-looking file paths relative to assetsDir (depth 0 + one nested level). */
function collectTrayLooking(dir, depth, relBase) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    const rel = relBase ? path.join(relBase, name) : name;
    if (st.isFile() && isTrayLookingName(name)) {
      found.push(rel);
    } else if (st.isDirectory() && depth < 1) {
      found.push(...collectTrayLooking(full, depth + 1, rel));
    }
  }
  return found;
}

const typos = [];
for (const rel of collectTrayLooking(assetsDir, 0, "")) {
  const base = path.basename(rel);
  if (expectedSet.has(base)) continue;
  typos.push(rel);
}

if (typos.length) {
  for (const t of typos) {
    console.error(`tray-looking typo (not in desktop-tray-icons.json): ${t}`);
  }
  process.exit(1);
}
console.log(`ok tray-icon typo scan under ${assetsDir} (incl. one nested level)`);