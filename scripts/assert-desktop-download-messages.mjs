/**
 * Gate: EN / pt-PT website message keys for desktop downloads + honest limits
 * must stay in lockstep so empty download slots cannot drift locales.
 *
 *   node scripts/assert-desktop-download-messages.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(".");

const REQUIRED = [
  "privacyPolicyLimitsTitle",
  "privacyPolicyLimitsBody",
  "desktopDownloadsTitle",
  "desktopDownloadsIntro",
  "desktopDownloadWindows",
  "desktopDownloadMac",
  "desktopDownloadLinux",
  "desktopDownloadSoon",
  "desktopDownloadPackaging",
  "desktopDownloadRelease",
  "desktopDownloadReleaseTag",
  "desktopDownloadSourceCdn",
  "desktopDownloadSourceGithub",
  "desktopDownloadMacSource",
  "desktopDownloadUnsignedUntilPromote",
  "desktopDownloadReadyToPromote",
  "desktopHonestLimitsLink",
  "privacyDesktopMirrorNote"
];

const downloads = JSON.parse(
  readFileSync(path.join(root, "shared/desktop-downloads.json"), "utf8")
);
for (const key of [
  "windowsNsisUrl",
  "macosAppZipUrl",
  "macosAppZipUrlUnsigned",
  "macosAppZipUrlNotarized",
  "linuxDebAmd64Url",
  "packagingDocsUrl",
  "releaseNotesUrl",
  "releaseTag",
  "mirrors"
]) {
  if (!(key in downloads)) {
    console.error(`shared/desktop-downloads.json missing ${key}`);
    process.exit(1);
  }
}
if (!String(downloads.releaseTag || "").trim()) {
  console.error("shared/desktop-downloads.json releaseTag must be non-empty");
  process.exit(1);
}

// Dynamic import of TS messages via tsx is heavy; parse the source instead.
const src = readFileSync(path.join(root, "i18n/messages.ts"), "utf8");
const enIdx = src.indexOf("\n  en: {");
const ptIdx = src.indexOf('\n  "pt-PT": {');
if (enIdx < 0 || ptIdx < 0) {
  console.error("Could not locate en / pt-PT message blocks in i18n/messages.ts");
  process.exit(1);
}
const enBlock = src.slice(enIdx, ptIdx);
const ptBlock = src.slice(ptIdx);

function hasKey(block, key) {
  return new RegExp(`\\b${key}\\s*:`).test(block);
}

let failed = 0;
for (const key of REQUIRED) {
  if (!hasKey(enBlock, key)) {
    console.error(`EN missing message key: ${key}`);
    failed += 1;
  }
  if (!hasKey(ptBlock, key)) {
    console.error(`pt-PT missing message key: ${key}`);
    failed += 1;
  }
}

const settingsPanel = readFileSync(path.join(root, "components/SettingsPanel.tsx"), "utf8");
if (!settingsPanel.includes('data-testid="settings-desktop-mac-cdn-desc"')) {
  console.error("SettingsPanel missing settings-desktop-mac-cdn-desc (CDN SR hook)");
  failed += 1;
}

// Download row must not carry aria-labelledby (section owns labelledby → heading).
const rowBlock = settingsPanel.match(
  /data-testid="settings-desktop-download-row"[\s\S]{0,400}?>/
);
if (!rowBlock) {
  console.error("SettingsPanel missing settings-desktop-download-row open tag");
  failed += 1;
} else if (/aria-labelledby=/.test(rowBlock[0])) {
  console.error(
    "settings-desktop-download-row must not gain aria-labelledby (section owns labelledby)"
  );
  failed += 1;
}

// Mac download link: describedby only — never aria-description (pairs with row labelledby gate).
const macBlock = settingsPanel.match(
  /data-testid="settings-desktop-download-mac"[\s\S]{0,500}?>/
);
if (!macBlock) {
  console.error("SettingsPanel missing settings-desktop-download-mac open tag");
  failed += 1;
} else if (/aria-description=/.test(macBlock[0])) {
  console.error(
    "settings-desktop-download-mac must not gain aria-description (use aria-describedby only)"
  );
  failed += 1;
}

// Win / Mac / Linux anchors in the download row — no aria-description anywhere in the <p>.
const rowParagraph = settingsPanel.match(
  /data-testid="settings-desktop-download-row"[\s\S]*?<\/p>/
);
if (!rowParagraph) {
  console.error("SettingsPanel missing settings-desktop-download-row paragraph");
  failed += 1;
} else if (/<a\b[^>]*\baria-description=/.test(rowParagraph[0])) {
  console.error(
    "settings-desktop-download-row anchors (Win/Mac/Linux) must not gain aria-description"
  );
  failed += 1;
}

// settings-desktop-heading must stay unique page-wide.
const headingHits = [...settingsPanel.matchAll(/id="settings-desktop-heading"/g)];
if (headingHits.length !== 1) {
  console.error(
    `SettingsPanel must declare id="settings-desktop-heading" exactly once (found ${headingHits.length})`
  );
  failed += 1;
}
if (settingsPanel.includes("AccountSettings") || settingsPanel.includes("settings-account")) {
  console.error(
    "SettingsPanel must not import AccountSettings / settings-account (Account sync cancelled)"
  );
  failed += 1;
}

if (failed) process.exit(1);
console.log("desktop download + honest-limits message keys ok (EN / pt-PT)");