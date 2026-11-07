/**
 * One-shot: EN + pt-PT restore reason strings for all quarantine error codes.
 * Exercises destination-exists then missing-quarantine (deleted quarantine file).
 * Temp dirs only — no long-lived fixture, never touches the real home.
 *
 *   npm run smoke:desktop-quarantine-i18n
 */

import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile, readFile, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

const root = path.resolve(".");
const uiPort = 32171;
const proxyPort = 32172;

const CODES = ["destination-exists", "missing-quarantine", "restore-failed"];
const EXPECT = {
  en: {
    "destination-exists": "original path is already occupied",
    "missing-quarantine": "quarantine copy is missing",
    "restore-failed": "could not move the file back"
  },
  "pt-PT": {
    "destination-exists": "o caminho original já está ocupado",
    "missing-quarantine": "a cópia em quarentena desapareceu",
    "restore-failed": "não foi possível repor o ficheiro"
  }
};

const i18nPath = path.join(root, "desktop-app/public/js/i18n.js");
const { STRINGS, t } = await import(pathToFileURL(i18nPath).href);

function fail(message) {
  throw new Error(message);
}

function keyFor(code) {
  if (code === "destination-exists") return "machineRestoreReason_destination_exists";
  if (code === "missing-quarantine") return "machineRestoreReason_missing_quarantine";
  return "machineRestoreReason_restore_failed";
}

for (const lang of ["en", "pt-PT"]) {
  for (const code of CODES) {
    const got = t(lang, keyFor(code));
    const want = EXPECT[lang][code];
    if (got !== want) fail(`${lang} ${code}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
    if (!STRINGS[lang][keyFor(code)]) fail(`${lang} missing key ${keyFor(code)}`);
  }
}

// Proxy guide Show control — EN + pt-PT must both be present and distinct from empty.
if (t("en", "proxyGuideShow") !== "Show proxy guide") {
  fail(`EN proxyGuideShow: got ${JSON.stringify(t("en", "proxyGuideShow"))}`);
}
if (t("pt-PT", "proxyGuideShow") !== "Mostrar guia do proxy") {
  fail(`pt-PT proxyGuideShow: got ${JSON.stringify(t("pt-PT", "proxyGuideShow"))}`);
}
if (!STRINGS.en.proxyGuideShow || !STRINGS["pt-PT"].proxyGuideShow) {
  fail("proxyGuideShow missing from STRINGS en/pt-PT");
}

const indexHtml = await readFile(path.join(root, "desktop-app/public/index.html"), "utf8");
// Account sync cancelled — UI must not reintroduce account sign-in rows.
if (indexHtml.includes('id="accountSection"') || indexHtml.includes("path-sync-account")) {
  fail("index.html must not include Account sync UI (product cancelled)");
}
if (!indexHtml.includes('id="listDomain"') || !indexHtml.includes('id="listDomain" class="field-input"')) {
  fail("#listDomain must use .field-input");
}

// Primary-path CTAs (machine / web) — EN + pt-PT required.
for (const [key, en, pt] of [
  ["pathScanMachine", "Scan this computer", "Analisar este computador"],
  ["pathCheckWeb", "Check a website", "Verificar um site"],
  ["checkOnWebsite", "Check on website", "Verificar no site"],
  ["websiteBlockOnDevice", "Block on this device", "Bloquear neste dispositivo"],
  ["threatSummaryTitle", "Threat summary", "Resumo de ameaças"]
]) {
  if (t("en", key) !== en) fail(`EN ${key}: got ${JSON.stringify(t("en", key))}`);
  if (t("pt-PT", key) !== pt) fail(`pt-PT ${key}: got ${JSON.stringify(t("pt-PT", key))}`);
}

if (!indexHtml.includes('data-testid="primary-path"') || !indexHtml.includes('data-testid="threat-summary"')) {
  fail("index.html must expose primary-path + threat-summary test ids");
}

const dash = await readFile(path.join(root, "desktop-app/public/js/dashboard.js"), "utf8");
if (!dash.includes("rememberWebCheck") || !dash.includes("blockHostOnDevice")) {
  fail("dashboard must implement web-check remember + block-on-device linkage");
}
if (!dash.includes('currentPrivacyMode() === "off"')) {
  fail("dashboard must avoid persisting web-check rows under Never store");
}
if (!dash.includes("preferNotarized") || !dash.includes("updateCheckDownload")) {
  fail("dashboard update-check must surface notarized download when preferNotarized");
}
if (!dash.includes("fillCheckFromThreatHost") || !dash.includes("threat-host-row")) {
  fail("threat summary host click must fill check box");
}
if (!dash.includes('ev.key !== "Enter"') && !dash.includes("ev.key !== 'Enter'")) {
  fail("threat summary host row must fill check on Enter");
}
if (!dash.includes("/api/proxy/macos-clear") || !dash.includes("proxyMacClear")) {
  fail("dashboard must wire macOS proxy clear");
}
if (!dash.includes("updateCheckNotarizedHead") || !dash.includes("notarizedHeadStatus")) {
  fail("update-check UI must show notarizedHeadStatus");
}
if (!dash.includes("Press Enter to check") && !dash.includes("press Enter to check")) {
  fail("threat host aria-label must mention Press Enter to check");
}
if (!STRINGS.en.updateCheckNotarizedReady || !STRINGS["pt-PT"].updateCheckNotarizedReady) {
  fail("updateCheckNotarizedReady missing EN/pt-PT");
}
if (!STRINGS.en.proxyMacSetHonest || !STRINGS["pt-PT"].proxyMacSet) {
  fail("macOS proxy one-click strings missing EN/pt-PT");
}
if (!dash.includes('code === "destination-exists"')) fail("dashboard missing destination-exists map");
if (!dash.includes('code === "missing-quarantine"')) fail("dashboard missing missing-quarantine map");
if (!dash.includes("machineRestoreReason_restore_failed")) fail("dashboard missing restore-failed fallback");
if (!dash.includes("restoreReasonTooltip") || !dash.includes("li.title")) {
  fail("dashboard quarantine rows should set bilingual tooltips via restoreReasonTooltip");
}
if (!dash.includes("aria-describedby") || !dash.includes("visually-hidden")) {
  fail("dashboard quarantine restore errors need aria-describedby + visually-hidden announcement");
}

const data = await mkdtemp(path.join(os.tmpdir(), "shield-q-i18n-"));
const fixture = await mkdtemp(path.join(os.tmpdir(), "shield-q-i18n-fx-"));
await mkdir(path.join(fixture, "Downloads"), { recursive: true });
await mkdir(path.join(data, "quarantine", "item1"), { recursive: true });
const occupied = path.join(fixture, "Downloads", "invoice.pdf.exe");
const qFile = path.join(data, "quarantine", "item1", "invoice.pdf.exe");
await writeFile(occupied, "occupied");
await writeFile(qFile, "q");
await writeFile(
  path.join(data, "quarantine", "manifest.json"),
  JSON.stringify({
    items: [
      {
        id: "item1",
        from: occupied,
        requested: occupied,
        to: qFile,
        at: new Date().toISOString()
      }
    ],
    hosts: []
  })
);
await writeFile(
  path.join(data, "shield-backup.json"),
  JSON.stringify({ schema: "shield-lists-v1", updatedAt: new Date().toISOString(), blocked: [], trusted: [] })
);

const child = spawn(process.execPath, ["src/server.js"], {
  cwd: path.join(root, "desktop-app"),
  env: {
    ...process.env,
    UI_PORT: String(uiPort),
    PROXY_PORT: String(proxyPort),
    SHIELD_DATA_DIR: data,
    SHIELD_LISTS_PATH: path.join(data, "shield-backup.json"),
    SHIELD_QUARANTINE_PATH: path.join(data, "quarantine"),
    SHIELD_MACHINE_DECISION_PATH: path.join(data, "machine-decision.json"),
    SHIELD_MACHINE_SCAN: "0",
    SHIELD_QUIT_GRACE_MS: "0"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

async function restore() {
  return fetch(`http://localhost:${uiPort}/api/machine-scan/restore`, { method: "POST" }).then((r) => r.json());
}

try {
  for (let i = 0; i < 50; i += 1) {
    try {
      if ((await fetch(`http://localhost:${uiPort}/api/state`)).ok) break;
    } catch {
      /* wait */
    }
    await delay(100);
  }

  const first = await restore();
  const code1 = first?.result?.errors?.[0]?.error;
  if (code1 !== "destination-exists") {
    fail(`first restore should report destination-exists, got ${JSON.stringify(code1)}`);
  }
  for (const lang of ["en", "pt-PT"]) {
    if (t(lang, keyFor(code1)) !== EXPECT[lang][code1]) fail(`runtime label mismatch ${lang} ${code1}`);
  }

  // Free the original path, delete the quarantine copy → missing-quarantine.
  await unlink(occupied);
  await unlink(qFile);
  const second = await restore();
  const code2 = second?.result?.errors?.[0]?.error;
  if (code2 !== "missing-quarantine") {
    fail(`second restore should report missing-quarantine, got ${JSON.stringify(code2)} body=${JSON.stringify(second)}`);
  }
  for (const lang of ["en", "pt-PT"]) {
    if (t(lang, keyFor(code2)) !== EXPECT[lang][code2]) fail(`runtime label mismatch ${lang} ${code2}`);
  }

  console.log("desktop quarantine i18n smoke ok");
} finally {
  child.kill("SIGTERM");
  await delay(300);
  await rm(data, { recursive: true, force: true });
  await rm(fixture, { recursive: true, force: true });
}