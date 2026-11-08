#!/usr/bin/env node
/**
 * Print locale pack coverage ratios for CI ::notice (pure Node — no tsx).
 * MUST_STAY_FULL list: i18n/must-stay-full-locales.json (single source).
 *
 *   node scripts/print-pack-coverage-summary.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const packsDir = path.join(root, "i18n/packs");
const en = JSON.parse(fs.readFileSync(path.join(packsDir, "_en.snapshot.json"), "utf8"));
const EN_KEYS = Object.keys(en);
const FULL_PACK_MIN_KEYS = Math.max(400, Math.floor(EN_KEYS.length * 0.9));
const MUST_STAY_FULL = JSON.parse(
  fs.readFileSync(path.join(root, "i18n/must-stay-full-locales.json"), "utf8")
);

const packFiles = fs
  .readdirSync(packsDir)
  .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
  .map((f) => f.replace(/\.json$/, ""))
  .sort();

function ratio(id) {
  if (id === "en" || id === "pt-PT") return 1;
  const p = path.join(packsDir, `${id}.json`);
  if (!fs.existsSync(p)) return 0;
  const pack = JSON.parse(fs.readFileSync(p, "utf8"));
  const hit = EN_KEYS.filter((k) => pack[k]?.trim()).length;
  return EN_KEYS.length ? hit / EN_KEYS.length : 0;
}

function isFull(id) {
  if (id === "en" || id === "pt-PT") return true;
  const p = path.join(packsDir, `${id}.json`);
  if (!fs.existsSync(p)) return false;
  const pack = JSON.parse(fs.readFileSync(p, "utf8"));
  return Object.keys(pack).filter((k) => pack[k]?.trim()).length >= FULL_PACK_MIN_KEYS;
}

const ids = ["en", "pt-PT", ...packFiles.filter((id) => id !== "en" && id !== "pt-PT")];
const rows = ids.map((id) => {
  const r = ratio(id);
  return `${id}=${(r * 100).toFixed(0)}%:${isFull(id) ? "full" : "partial"}`;
});
console.log(`[pack-coverage] minKeys=${FULL_PACK_MIN_KEYS} ${rows.join(" ")}`);

const dropped = MUST_STAY_FULL.filter((id) => !isFull(id));
if (dropped.length) {
  console.error(`[pack-coverage] FULL regression: ${dropped.join(", ")}`);
  process.exit(1);
}

const partials = packFiles.filter((id) => !isFull(id));
const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (partials.length) {
  const detail = partials.map((id) => `${id}=${(ratio(id) * 100).toFixed(0)}%`).join(" ");
  console.warn(`[pack-coverage] still-partial (${partials.length}): ${detail}`);
  console.log(`::warning::[pack-coverage] still-partial locales: ${partials.join(", ")}`);
  if (summaryPath) {
    const table = [
      "## Pack coverage — still partial",
      "",
      "| Locale | Ratio |",
      "|--------|------:|",
      ...partials.map((id) => `| \`${id}\` | ${(ratio(id) * 100).toFixed(0)}% |`),
      ""
    ].join("\n");
    fs.appendFileSync(summaryPath, `${table}\n`);
  }
} else {
  console.log("::notice::[pack-coverage] all-full");
  if (summaryPath) {
    fs.appendFileSync(summaryPath, "## Pack coverage\n\nAll locale packs are **full** (zero partial).\n\n");
  }
}
