#!/usr/bin/env node
/**
 * Rebuild i18n/must-stay-full-locales.json from packs that currently pass
 * the FULL_PACK_MIN_KEYS threshold (same rule as isFullLocalePack).
 *
 *   node scripts/sync-must-stay-full-locales.mjs
 *   node scripts/sync-must-stay-full-locales.mjs --check
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
const packsDir = path.join(root, "i18n/packs");
const outPath = path.join(root, "i18n/must-stay-full-locales.json");
const en = JSON.parse(fs.readFileSync(path.join(packsDir, "_en.snapshot.json"), "utf8"));
const EN_KEYS = Object.keys(en);
const FULL_PACK_MIN_KEYS = Math.max(400, Math.floor(EN_KEYS.length * 0.9));

const full = fs
  .readdirSync(packsDir)
  .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
  .map((f) => f.replace(/\.json$/, ""))
  .filter((id) => {
    const pack = JSON.parse(fs.readFileSync(path.join(packsDir, `${id}.json`), "utf8"));
    return Object.keys(pack).filter((k) => pack[k]?.trim()).length >= FULL_PACK_MIN_KEYS;
  })
  .sort();

const next = `${JSON.stringify(full, null, 2)}\n`;

if (checkOnly) {
  const cur = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "";
  if (cur !== next) {
    console.error(
      "[sync-must-stay-full] drift — run: node scripts/sync-must-stay-full-locales.mjs"
    );
    process.exit(1);
  }
  console.info(`[sync-must-stay-full] OK (${full.length} locales, minKeys=${FULL_PACK_MIN_KEYS})`);
  process.exit(0);
}

fs.writeFileSync(outPath, next);
console.info(`[sync-must-stay-full] wrote ${full.length} locales → i18n/must-stay-full-locales.json`);
