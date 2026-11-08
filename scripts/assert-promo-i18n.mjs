/**
 * Poster HTML must embed live i18n strings (EN / pt-PT / zh-Hans).
 *
 *   npm run assert:promo-i18n
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getMessages } from "../i18n/messages.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const poster = fs.readFileSync(path.join(root, "public/promo/poster.html"), "utf8");

/** Body columns — must match each locale pack. */
const bodyKeys = [
  "check",
  "lightIdle",
  "nextStepLeave",
  "nextStepNoCredentials",
  "nextStepVerifyOfficial",
  "leave",
  "ignoreRiskBody",
  "privacyNote",
  "lightLimited",
  "lightDanger",
];
/** Shared signal strip is bilingual small type (EN · pt-PT · zh-Hans). */
const signalKeys = ["lightStandby", "lightSafe", "lightCaution", "lightDanger", "navCheck"];

function embedded(value) {
  const needle = value.length > 24 ? value.slice(0, 24) : value;
  if (poster.includes(needle)) return true;
  const esc = needle
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return poster.includes(esc);
}

let failed = false;
for (const locale of ["en", "pt-PT", "zh-Hans"]) {
  const t = getMessages(locale);
  for (const key of bodyKeys) {
    const value = t[key];
    if (!value || typeof value !== "string") {
      console.error(`[assert-promo-i18n] missing ${locale}.${key}`);
      failed = true;
      continue;
    }
    if (!embedded(value)) {
      console.error(`[assert-promo-i18n] poster missing ${locale}.${key}: “${value.slice(0, 24)}…”`);
      failed = true;
    }
  }
}
for (const locale of ["en", "pt-PT", "zh-Hans"]) {
  const t = getMessages(locale);
  for (const key of signalKeys) {
    if (!embedded(t[key])) {
      console.error(`[assert-promo-i18n] signal strip missing ${locale}.${key}`);
      failed = true;
    }
  }
}

if (!/lang="en"/.test(poster) || !/lang="pt-PT"/.test(poster) || !/lang="zh-Hans"/.test(poster)) {
  console.error("[assert-promo-i18n] poster must declare en + pt-PT + zh-Hans panes");
  failed = true;
}

if (!poster.includes("/zh-Hans/privacy")) {
  console.error("[assert-promo-i18n] poster must link /zh-Hans/privacy");
  failed = true;
}

// Catalog Europe packs are full — Halt chrome must not still be EN leftovers.
for (const locale of ["it", "nl", "pl", "sv", "da", "fi", "nb", "fr", "es", "de"]) {
  const t = getMessages(locale);
  const en = getMessages("en");
  if (!t.lightDanger || t.lightDanger === en.lightDanger) {
    // fr/de may keep cognate Halt/Stop — only fail when identical to EN "Halt" for non-de.
    if (locale !== "de" && t.lightDanger === "Halt") {
      console.error(`[assert-promo-i18n] ${locale}.lightDanger still EN Halt (Europe packs are full)`);
      failed = true;
    }
  }
  if (!t.go || t.go === en.go) {
    console.error(`[assert-promo-i18n] ${locale}.go still EN (Europe packs are full)`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.info(
  `[assert-promo-i18n] OK body ${bodyKeys.length} keys × 3 locales + bilingual signal + privacy foot + Europe Halt chrome`,
);
