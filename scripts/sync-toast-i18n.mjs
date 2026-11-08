#!/usr/bin/env node
/**
 * Rebuild extension toast COPY from website packs (toast-sized keys only).
 * Locales = every <option> in extension/popup/popup.html #langSelect, plus pt-BR/zh-Hant/ja/de/fr/es when packs exist.
 * Patches only the TOAST_COPY_START/END block in phishing-toast-mount.js (never drops buildPhishingToast).
 *
 *   node scripts/sync-toast-i18n.mjs
 *   node scripts/sync-toast-i18n.mjs --check
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const packsDir = path.join(root, "i18n/packs");
const checkOnly = process.argv.includes("--check");
const en = JSON.parse(fs.readFileSync(path.join(packsDir, "_en.snapshot.json"), "utf8"));
const pt = JSON.parse(fs.readFileSync(path.join(packsDir, "_pt-PT.snapshot.json"), "utf8"));

function toastFromBag(bag, localeId) {
  const danger = bag.lightDanger || en.lightDanger;
  const dangerLabel = bag.dangerLevelLabel || en.dangerLevelLabel;
  // Prefer dedicated pack key (extensionToastPhishing); hardcodes remain fallback only.
  const phishing =
    bag.extensionToastPhishing ||
    en.extensionToastPhishing ||
    "Phishing pattern blocked";
  return {
    phishing,
    dismiss: bag.feedbackDismissAfterReportHint || bag.leave || "Dismiss",
    dangerLevel: `${dangerLabel}: ${danger}`,
    ignoreRisk: bag.ignoreRiskBody || en.ignoreRiskBody,
    nextStepsTitle: bag.nextStepsTitle || en.nextStepsTitle,
    nextLeave: bag.nextStepLeave || en.nextStepLeave,
    nextNoCreds: bag.nextStepNoCredentials || en.nextStepNoCredentials,
    nextVerify: bag.nextStepVerifyOfficial || en.nextStepVerifyOfficial
  };
}

function localesFromLangSelect() {
  const html = fs.readFileSync(path.join(root, "extension/popup/popup.html"), "utf8");
  const block = html.match(/id="langSelect"[\s\S]*?<\/select>/);
  if (!block) return ["en", "pt-PT", "zh-Hans"];
  return [...block[0].matchAll(/<option\s+value="([^"]+)"/g)].map((m) => m[1]);
}

// Overlay Halt chips beyond the popup #langSelect set (af/zu + BR/ja extras).
const EXTRA_PACKS = ["pt-BR", "ja", "af", "zu"];
const langSelectOrder = localesFromLangSelect();
const locales = [...new Set([...langSelectOrder, ...EXTRA_PACKS])];

const COPY = {};
// Emit in langSelect order first so option↔COPY key order stays aligned for parity tests.
for (const id of locales) {
  if (COPY[id]) continue;
  if (id === "en") {
    COPY.en = toastFromBag(en, "en");
    continue;
  }
  if (id === "pt-PT") {
    COPY["pt-PT"] = toastFromBag(pt, "pt-PT");
    continue;
  }
  const packPath = path.join(packsDir, `${id}.json`);
  if (!fs.existsSync(packPath)) continue;
  const pack = JSON.parse(fs.readFileSync(packPath, "utf8"));
  const base = id.startsWith("pt") ? { ...pt, ...pack } : { ...en, ...pack };
  COPY[id] = toastFromBag(base, id);
}

const outJson = path.join(root, "extension/content/phishing-toast-i18n.json");
const expectedJson = JSON.stringify(COPY, null, 2) + "\n";
const mountPath = path.join(root, "extension/content/phishing-toast-mount.js");
const COPY_START = "/* TOAST_COPY_START */";
const COPY_END = "/* TOAST_COPY_END */";

function assertMountApi(mount) {
  for (const needle of ["buildPhishingToast", "resolveToastLang", "result-next-steps", "result-ignore-risk", COPY_START, COPY_END]) {
    if (!mount.includes(needle)) {
      console.error(`[sync-toast-i18n] mount missing API marker: ${needle}`);
      process.exit(1);
    }
  }
  for (const id of Object.keys(COPY)) {
    if (!mount.includes(COPY[id].phishing)) {
      console.error(`[sync-toast-i18n] mount missing phishing for ${id}: ${COPY[id].phishing}`);
      process.exit(1);
    }
  }
}

function patchMountCopy(mount) {
  const start = mount.indexOf(COPY_START);
  const end = mount.indexOf(COPY_END);
  if (start < 0 || end < 0 || end <= start) {
    console.error("[sync-toast-i18n] phishing-toast-mount.js missing TOAST_COPY_START/END markers");
    process.exit(1);
  }
  const copyLiteral = JSON.stringify(COPY, null, 2);
  return (
    mount.slice(0, start + COPY_START.length) +
    `\n  const COPY = ${copyLiteral};\n  ` +
    mount.slice(end)
  );
}

if (checkOnly) {
  if (!fs.existsSync(outJson)) {
    console.error("[sync-toast-i18n] missing phishing-toast-i18n.json — run: npm run sync:toast-i18n");
    process.exit(1);
  }
  const onDisk = fs.readFileSync(outJson, "utf8");
  if (onDisk !== expectedJson) {
    console.error("[sync-toast-i18n] phishing-toast-i18n.json drifts from packs — run: npm run sync:toast-i18n");
    process.exit(1);
  }
  const mount = fs.readFileSync(mountPath, "utf8");
  assertMountApi(mount);
  if (patchMountCopy(mount) !== mount) {
    console.error("[sync-toast-i18n] mount COPY drifts from packs — run: npm run sync:toast-i18n");
    process.exit(1);
  }
  console.info(`[sync-toast-i18n] OK (${Object.keys(COPY).length} locales from langSelect+packs)`);
  process.exit(0);
}

fs.writeFileSync(outJson, expectedJson);

let mount = fs.readFileSync(mountPath, "utf8");
mount = patchMountCopy(mount);
assertMountApi(mount);
fs.writeFileSync(mountPath, mount);
console.log(
  `Synced toast i18n (${Object.keys(COPY).length} locales; langSelect=${localesFromLangSelect().join(",")}) → ${path.relative(root, outJson)}`
);
