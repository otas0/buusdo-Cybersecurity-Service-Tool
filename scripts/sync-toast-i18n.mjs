#!/usr/bin/env node
/**
 * Rebuild extension toast COPY from website packs (toast-sized keys only).
 * Locales = every <option> in extension/popup/popup.html #langSelect, plus pt-BR/zh-Hant/ja/de/fr/es when packs exist.
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
  let phishing = "Phishing pattern blocked";
  if (localeId.startsWith("zh")) phishing = "已拦截钓鱼模式";
  else if (localeId === "ja") phishing = "フィッシングパターンをブロックしました";
  else if (localeId.startsWith("pt")) phishing = "Padrão de phishing bloqueado";
  else if (localeId === "th") phishing = "บล็อกรูปแบบฟิชชิงแล้ว";
  else if (localeId === "vi") phishing = "Đã chặn mẫu lừa đảo";
  else if (localeId === "mi") phishing = "Kua ārai te tauira tinihanga";
  else if (localeId === "de") phishing = "Phishing-Muster blockiert";
  else if (localeId === "fr") phishing = "Modèle de phishing bloqué";
  else if (localeId === "es") phishing = "Patrón de phishing bloqueado";
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

const EXTRA_PACKS = ["pt-BR", "zh-Hant", "ja", "de", "fr", "es"];
const locales = [...new Set([...localesFromLangSelect(), ...EXTRA_PACKS])];

const COPY = {};
COPY.en = toastFromBag(en, "en");
COPY["pt-PT"] = toastFromBag(pt, "pt-PT");

for (const id of locales) {
  if (id === "en" || id === "pt-PT") continue;
  const packPath = path.join(packsDir, `${id}.json`);
  if (!fs.existsSync(packPath)) continue;
  const pack = JSON.parse(fs.readFileSync(packPath, "utf8"));
  const base = id.startsWith("pt") ? { ...pt, ...pack } : { ...en, ...pack };
  COPY[id] = toastFromBag(base, id);
}

const outJson = path.join(root, "extension/content/phishing-toast-i18n.json");
const expectedJson = JSON.stringify(COPY, null, 2) + "\n";
const mountPath = path.join(root, "extension/content/phishing-toast-mount.js");

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
  for (const id of Object.keys(COPY)) {
    if (!mount.includes(COPY[id].phishing)) {
      console.error(`[sync-toast-i18n] mount missing phishing for ${id}`);
      process.exit(1);
    }
  }
  console.info(`[sync-toast-i18n] OK (${Object.keys(COPY).length} locales from langSelect+packs)`);
  process.exit(0);
}

fs.writeFileSync(outJson, expectedJson);

let mount = fs.readFileSync(mountPath, "utf8");
const copyLiteral = JSON.stringify(COPY, null, 2).replace(/\$/g, "$$$$");
if (!/const COPY = \{/.test(mount)) {
  console.error("[sync-toast-i18n] phishing-toast-mount.js missing COPY block");
  process.exit(1);
}
mount = mount.replace(/const COPY = \{[\s\S]*?\n  \};/, `const COPY = ${copyLiteral};`);

if (!mount.includes("function resolveToastLang")) {
  mount = mount.replace(
    "(function phishingToastMountFactory(global) {\n  const COPY =",
    `(function phishingToastMountFactory(global) {
  function resolveToastLang(raw) {
    const id = String(raw || "en");
    if (COPY[id]) return id;
    if (id.startsWith("zh-Hant") || id === "zh-TW" || id === "zh-HK") return COPY["zh-Hant"] ? "zh-Hant" : "en";
    if (id.startsWith("zh")) return COPY["zh-Hans"] ? "zh-Hans" : "en";
    if (id.startsWith("pt")) return COPY["pt-PT"] ? "pt-PT" : "en";
    if (id === "jp") return COPY.ja ? "ja" : "en";
    return "en";
  }
  const COPY =`
  );
}

fs.writeFileSync(mountPath, mount);
console.log(
  `Synced toast i18n (${Object.keys(COPY).length} locales; langSelect=${localesFromLangSelect().join(",")}) → ${path.relative(root, outJson)}`
);
