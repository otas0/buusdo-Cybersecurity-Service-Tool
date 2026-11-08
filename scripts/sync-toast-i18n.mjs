#!/usr/bin/env node
/**
 * Rebuild extension toast COPY from website packs (toast-sized keys only).
 * Writes extension/content/phishing-toast-i18n.json and patches phishing-toast-mount.js COPY block.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const packsDir = path.join(root, "i18n/packs");
const en = JSON.parse(fs.readFileSync(path.join(packsDir, "_en.snapshot.json"), "utf8"));
const pt = JSON.parse(fs.readFileSync(path.join(packsDir, "_pt-PT.snapshot.json"), "utf8"));

/** Map website message keys → toast COPY keys */
const MAP = {
  phishing: null, // special
  dismiss: "feedbackDismissAfterReportHint",
  dangerLevel: null, // composed
  ignoreRisk: "ignoreRiskBody",
  nextStepsTitle: "nextStepsTitle",
  nextLeave: "nextStepLeave",
  nextNoCreds: "nextStepNoCredentials",
  nextVerify: "nextStepVerifyOfficial"
};

function toastFromBag(bag, localeId) {
  const danger = bag.lightDanger || en.lightDanger;
  const dangerLabel = bag.dangerLevelLabel || en.dangerLevelLabel;
  return {
    phishing:
      localeId.startsWith("zh")
        ? "已拦截钓鱼模式"
        : localeId === "ja"
          ? "フィッシングパターンをブロックしました"
          : localeId.startsWith("pt")
            ? "Padrão de phishing bloqueado"
            : "Phishing pattern blocked",
    dismiss: bag.feedbackDismissAfterReportHint || bag.leave || "Dismiss",
    dangerLevel: `${dangerLabel}: ${danger}`,
    ignoreRisk: bag.ignoreRiskBody || en.ignoreRiskBody,
    nextStepsTitle: bag.nextStepsTitle || en.nextStepsTitle,
    nextLeave: bag.nextStepLeave || en.nextStepLeave,
    nextNoCreds: bag.nextStepNoCredentials || en.nextStepNoCredentials,
    nextVerify: bag.nextStepVerifyOfficial || en.nextStepVerifyOfficial
  };
}

const locales = ["en", "pt-PT", "pt-BR", "zh-Hans", "zh-Hant", "ja", "de", "fr", "es"];
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
fs.writeFileSync(outJson, JSON.stringify(COPY, null, 2) + "\n");

const mountPath = path.join(root, "extension/content/phishing-toast-mount.js");
let mount = fs.readFileSync(mountPath, "utf8");
const copyLiteral = JSON.stringify(COPY, null, 2).replace(/\$/g, "$$$$");
mount = mount.replace(
  /const COPY = \{[\s\S]*?\n  \};/,
  `const COPY = ${copyLiteral};`
);
// Resolve lang via catalog-ish normalize
mount = mount.replace(
  /const lang = opts\?\.lang === "pt-PT" \? "pt-PT" : "en";/,
  `const lang = resolveToastLang(opts?.lang);`
);
mount = mount.replace(
  /return COPY\[lang === "pt-PT" \? "pt-PT" : "en"\]\.dismiss;/,
  `return COPY[resolveToastLang(lang)].dismiss;`
);

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
console.log(`Synced toast i18n (${Object.keys(COPY).length} locales) → ${path.relative(root, outJson)}`);
void MAP;
