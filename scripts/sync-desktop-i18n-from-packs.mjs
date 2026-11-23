#!/usr/bin/env node
/**
 * Overlay website pack chrome onto desktop STRINGS for ja / zh-Hant / zh-Hans,
 * pt-BR (from pt-PT base + pack), Nordic packs (sv / da / fi / nb), and Europe
 * popup locales (de / fr / es / it / nl).
 * Preserves existing bag keys (machine*, etc.) and only overwrites MAP keys from packs.
 *
 *   node scripts/sync-desktop-i18n-from-packs.mjs
 *   node scripts/sync-desktop-i18n-from-packs.mjs --check
 *   node scripts/sync-desktop-i18n-from-packs.mjs --dry-run-missing-fixture
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
/** Dry-run: emit a fake missing-key matrix + summary markdown (exit 0) for fixture tests. */
const dryRunMissingFixture = process.argv.includes("--dry-run-missing-fixture");
const i18nPath = path.join(root, "desktop-app/public/js/i18n.js");
const packsDir = path.join(root, "i18n/packs");

/**
 * @param {{ locale: string, key: string }[]} matrix
 * @param {object} payload
 */
function formatMissingMatrixSummaryMarkdown(matrix, payload) {
  const rows = matrix.map((r) => `| ${r.locale} | ${r.key} |`).join("\n");
  return `\n### sync-desktop-i18n missing (locale×key)\n\n| locale | key |\n| --- | --- |\n${rows}\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n`;
}

if (dryRunMissingFixture) {
  const matrix = [
    { locale: "ja", key: "optionalUpdateShowHint" },
    { locale: "de", key: "honestLimitsMinSupportedNote" }
  ];
  const payload = {
    syncDesktopI18nMissing: matrix,
    forceLocales: ["ja", "de"],
    forceKeys: ["optionalUpdateShowHint", "honestLimitsMinSupportedNote"]
  };
  const md = formatMissingMatrixSummaryMarkdown(matrix, payload);
  const outPath = process.env.SHIELD_SYNC_MISSING_SUMMARY_OUT;
  if (outPath) {
    fs.writeFileSync(outPath, md);
  } else {
    process.stdout.write(md);
  }
  process.exit(0);
}

const MAP = {
  appTitle: "prototype",
  statusKicker: "statusKicker",
  scan: "go",
  scanning: "checking",
  statusStandby: "lightStandby",
  statusSafe: "lightSafe",
  statusCaution: "lightCaution",
  statusDanger: "lightDanger",
  statusIdle: "lightIdle",
  dangerLevelLabel: "dangerLevelLabel",
  ignoreRiskTitle: "ignoreRiskTitle",
  ignoreRiskBody: "ignoreRiskBody",
  privacyLabel: "privacyLabel",
  privacyOff: "privacyOff",
  privacyLocal: "privacyLocal",
  privacyShare: "privacyShare",
  privacyHint: "privacyNote",
  langLabel: "navAriaLabel",
  // Desktop chrome leftovers commonly left in EN on ja — map when pack has a close key.
  detailSafe: "evidenceNoMatchTitle",
  detailDanger: "evidenceLookalikeTitle",
  // Account / lists — website pack keys (survive sync without one-shot ja edits)
  accountTitle: "accountTitle",
  accountHint: "accountHint",
  accountEmailPlaceholder: "accountEmailPlaceholder",
  accountSendLink: "accountSendLink",
  accountSyncToggle: "accountSyncToggle",
  accountSyncNow: "accountSyncNow",
  accountSignOut: "accountSignOut",
  accountSignedIn: "accountSignedInAs",
  accountSignedOut: "accountSignedOut",
  accountMagicSent: "accountMagicSent",
  accountSyncMerged: "accountSyncMerged",
  accountDisabled: "accountDisabled",
  accountOfflineBackup: "accountOfflineBackup",
  accountSyncFail: "accountError",
  listsTitle: "listsOfflineKicker",
  listsHint: "listsOfflineIntro",
  pathSyncAccount: "accountSyncToggle",
  // Gate title is desktop-specific; website honestLimitsTitle stays product chrome (kicker).
  honestLimitsTitle: "desktopHonestLimitsGateTitle",
  honestLimitsKicker: "honestLimitsTitle",
  honestLimitsItemAv: "honestLimitNoAv",
  honestLimitsBody: "honestLimitNoWipe",
  toastPhishing: "lightDanger",
  toastTracker: "lightCaution",
  toastTrackers: "lightCaution",
  // Real proxyGuide* pack keys (website packs carry desktop proxy chrome)
  proxyGuideSummary: "proxyGuideSummary",
  proxyGuideShow: "proxyGuideShow",
  proxyGuideLead: "proxyGuideLead",
  proxyGuideMac: "proxyGuideMac",
  proxyGuideWin: "proxyGuideWin",
  proxyGuideLinux: "proxyGuideLinux",
  proxyGuideBrowser: "proxyGuideBrowser",
  proxyGuideCurl: "proxyGuideCurl",
  proxyGuideAfterBlock: "proxyGuideAfterBlock",
  proxyBody: "proxyGuideLead",
  // Desktop update tip reset — packs keep overlay locales from drifting to EN.
  optionalUpdateShowHint: "optionalUpdateShowHint",
  optionalUpdateTipAvailable: "optionalUpdateTipAvailable",
  honestLimitsMinSupportedNote: "honestLimitsMinSupportedNote"
};

// Desktop-only ja strings (website / lists UI without pack twins). Applied after MAP.
const jaExtraPath = path.join(root, "desktop-app/public/js/i18n-ja-extra.json");

const markerStart = "/* __DESKTOP_PACK_OVERLAY_START__ */";
const markerEnd = "/* __DESKTOP_PACK_OVERLAY_END__ */";
const NORDIC = ["sv", "da", "fi", "nb"];
const EUROPE_DESKTOP = ["de", "fr", "es", "it", "nl"];
const OVERLAY_LOCALES = [...NORDIC, ...EUROPE_DESKTOP];
/** Managed inside the overlay block (pt-PT bag base + pt-BR pack MAP). */
const PT_BR = "pt-BR";

function parseEnBag(src) {
  const enMatch = src.match(/export const STRINGS = \{\s*en:\s*(\{[\s\S]*?\n  \}),\s*\n  "pt-PT":/);
  if (!enMatch) throw new Error("could not parse STRINGS.en");
  return Function(`"use strict"; return (${enMatch[1]});`)();
}

function parsePtPtBag(src) {
  const m = src.match(/"pt-PT":\s*(\{[\s\S]*?\n  \})\s*\n\};/);
  if (!m) throw new Error("could not parse STRINGS[pt-PT]");
  return Function(`"use strict"; return (${m[1]});`)();
}

function extractBag(src, id) {
  const re = new RegExp(`STRINGS\\[${JSON.stringify(id)}\\] = (\\{[\\s\\S]*?\\n\\});`);
  const m = src.match(re);
  if (!m) return null;
  try {
    return Function(`"use strict"; return (${m[1]});`)();
  } catch {
    return null;
  }
}

function loadPack(id) {
  const p = path.join(packsDir, `${id}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function applyOverlay(base, pack) {
  const out = { ...base };
  if (!pack) return out;
  for (const [desk, web] of Object.entries(MAP)) {
    if (pack[web]?.trim()) out[desk] = pack[web];
  }
  delete out.footA4Poster;
  return out;
}

function assignLiteral(id, bag) {
  return `STRINGS[${JSON.stringify(id)}] = ${JSON.stringify(bag, null, 2)};`;
}

function buildBlock(bags) {
  return [
    markerStart,
    "// Auto-generated by scripts/sync-desktop-i18n-from-packs.mjs — mapped chrome from website packs; other keys preserved.",
    assignLiteral("zh-Hans", bags["zh-Hans"]),
    assignLiteral("zh-Hant", bags["zh-Hant"]),
    assignLiteral("ja", bags.ja),
    assignLiteral(PT_BR, bags[PT_BR]),
    ...OVERLAY_LOCALES.map((id) => assignLiteral(id, bags[id])),
    markerEnd
  ].join("\n");
}

const src = fs.readFileSync(i18nPath, "utf8");
const enBag = parseEnBag(src);

// Prefer prior committed zh-Hans as CJK machine* base when current overlay wiped it.
let priorZhHans = extractBag(src, "zh-Hans");
if (!priorZhHans || priorZhHans.machineScope === enBag.machineScope) {
  try {
    const head = execSync("git show HEAD:desktop-app/public/js/i18n.js", {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 5_000_000
    });
    priorZhHans = extractBag(head, "zh-Hans") || priorZhHans;
  } catch {
    /* no git */
  }
}

const packs = {
  "zh-Hans": loadPack("zh-Hans"),
  "zh-Hant": loadPack("zh-Hant"),
  ja: loadPack("ja"),
  [PT_BR]: loadPack(PT_BR),
  ...Object.fromEntries(OVERLAY_LOCALES.map((id) => [id, loadPack(id)]))
};
for (const [id, pack] of Object.entries(packs)) {
  if (!pack) {
    console.error(`[sync-desktop-i18n] missing pack ${id}.json`);
    process.exit(1);
  }
}

const ptPtBag = parsePtPtBag(src);

const bags = {
  "zh-Hans": applyOverlay(priorZhHans || enBag, packs["zh-Hans"]),
  // zh-Hant: start from zh-Hans bag (CJK machine*) then overlay Hant pack chrome
  "zh-Hant": applyOverlay(
    { ...(priorZhHans || enBag), ...(extractBag(src, "zh-Hant") || {}) },
    packs["zh-Hant"]
  ),
  ja: applyOverlay({ ...enBag, ...(extractBag(src, "ja") || {}) }, packs.ja),
  // pt-BR: Portugal bag base + prior pt-BR desktop-only keys + BR pack chrome
  [PT_BR]: applyOverlay(
    { ...ptPtBag, ...(extractBag(src, PT_BR) || {}) },
    packs[PT_BR]
  ),
  ...Object.fromEntries(
    OVERLAY_LOCALES.map((id) => [
      id,
      applyOverlay({ ...enBag, ...(extractBag(src, id) || {}) }, packs[id])
    ])
  )
};

if (fs.existsSync(jaExtraPath)) {
  const jaExtra = JSON.parse(fs.readFileSync(jaExtraPath, "utf8"));
  Object.assign(bags.ja, jaExtra);
}

const block = buildBlock(bags);
let next = src;
if (src.includes(markerStart) && src.includes(markerEnd)) {
  next = src.replace(
    new RegExp(
      `${markerStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${markerEnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
    ),
    () => block
  );
} else {
  next = next.replace(/\nSTRINGS\["zh-Hans"\] = \{[\s\S]*?\n\};\n/, "\n");
  next = next.replace(/\nSTRINGS\["zh-Hant"\] = \{[\s\S]*?\n\};\n/, "\n");
  next = next.replace(/\nSTRINGS\["ja"\] = \{[\s\S]*?\n\};\n/, "\n");
  next = next.replace(/\nSTRINGS\["pt-BR"\] = \{[\s\S]*?\n\};\n/, "\n");
  for (const id of OVERLAY_LOCALES) {
    next = next.replace(new RegExp(`\\nSTRINGS\\[${JSON.stringify(id)}\\] = \\{[\\s\\S]*?\\n\\};\\n`), "\n");
  }
  next = next.replace("\nexport function t(", `\n${block}\n\nexport function t(`);
}

/** Desktop-only force/update keys preserved in overlay bags (not all in MAP). */
const FORCE_UPDATE_KEYS = [
  "forceUpdateKicker",
  "forceUpdateTitle",
  "forceUpdateBody",
  "forceUpdateDownload",
  "forceUpdateAfterDownload",
  "forceUpdateSetupGuide",
  "optionalUpdateBanner",
  "optionalUpdateDismiss",
  "optionalUpdateShowHint",
  "optionalUpdateTipAvailable",
  "honestLimitsMinSupportedNote",
  "updateCheckOffline",
  "honestLimitsItemOffline"
];

if (checkOnly) {
  const zhHansAssigns = src.match(/STRINGS\["zh-Hans"\]\s*=/g) || [];
  if (zhHansAssigns.length !== 1) {
    console.error(
      `[sync-desktop-i18n] expected exactly one STRINGS["zh-Hans"] assign, found ${zhHansAssigns.length}`
    );
    process.exit(1);
  }
  if (src !== next) {
    console.error("[sync-desktop-i18n] drift — run: node scripts/sync-desktop-i18n-from-packs.mjs");
    process.exit(1);
  }
  const forceLocales = [PT_BR, "ja", "zh-Hans", "zh-Hant", ...OVERLAY_LOCALES];
  /** @type {string[]} */
  const missing = [];
  /** @type {{ locale: string, key: string }[]} */
  const matrix = [];
  for (const locale of forceLocales) {
    for (const key of FORCE_UPDATE_KEYS) {
      if (!bags[locale][key]?.trim()) {
        missing.push(`${locale}×${key}`);
        matrix.push({ locale, key });
      }
    }
  }
  // Tip keys must not stay as EN in overlay packs (same gate as must-stay-full).
  const TIP_NO_EN_KEYS = [
    "optionalUpdateShowHint",
    "optionalUpdateTipAvailable",
    "honestLimitsMinSupportedNote"
  ];
  let enTipBag = {};
  try {
    enTipBag = parseEnBag(src);
  } catch {
    enTipBag = {};
  }
  /** @type {string[]} */
  const stillEn = [];
  for (const locale of forceLocales) {
    if (locale === "en") continue;
    for (const key of TIP_NO_EN_KEYS) {
      const val = String(bags[locale]?.[key] || "").trim();
      const enVal = String(enTipBag[key] || "").trim();
      if (val && enVal && val === enVal) {
        stillEn.push(`${locale}×${key}`);
        matrix.push({ locale, key: `${key}:still-EN` });
      }
    }
  }
  if (missing.length || stillEn.length) {
    if (missing.length) {
      console.error("[sync-desktop-i18n] missing force/update keys (locale×key):");
      for (const row of missing) console.error(`  ${row}`);
    }
    if (stillEn.length) {
      console.error("[sync-desktop-i18n] tip keys still EN (locale×key) — refuse packing EN copy:");
      for (const row of stillEn) console.error(`  ${row}`);
    }
    const payload = {
      syncDesktopI18nMissing: matrix,
      forceLocales,
      forceKeys: FORCE_UPDATE_KEYS,
      tipStillEn: stillEn
    };
    // Machine-readable matrix for CI annotations / job summaries.
    console.error(JSON.stringify(payload, null, 2));
    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (summaryPath && process.env.GITHUB_ACTIONS === "true") {
      try {
        fs.appendFileSync(summaryPath, formatMissingMatrixSummaryMarkdown(matrix, payload));
      } catch (e) {
        const msg = e && typeof e === "object" && "message" in e ? e.message : e;
        console.warn("[sync-desktop-i18n] GITHUB_STEP_SUMMARY append soft-fail:", msg);
      }
    }
    process.exit(1);
  }
  console.info(
    `[sync-desktop-i18n] OK (force keys: ${forceLocales.join(",")}; locales=${forceLocales.length})`
  );
  process.exit(0);
}

fs.writeFileSync(i18nPath, next);
console.log(
  `Synced desktop STRINGS ja/zh-Hant/zh-Hans/pt-BR + ${OVERLAY_LOCALES.join(",")} (zh-Hans machineScope zh? ${/[\u4e00-\u9fff]/.test(bags["zh-Hans"].machineScope || "")})`
);
