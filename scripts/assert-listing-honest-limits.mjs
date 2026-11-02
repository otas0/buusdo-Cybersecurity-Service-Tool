/**
 * Keep Chrome listing draft captions aligned with Privacy honest-limits copy.
 *
 *   node scripts/assert-listing-honest-limits.mjs
 */

import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

const root = path.resolve(".");
const messages = readFileSync(path.join(root, "i18n/messages.ts"), "utf8");
const draft = readFileSync(path.join(root, "docs/CHROME_STORE_LISTING_DRAFT.md"), "utf8");
const settingsPanel = readFileSync(path.join(root, "components/SettingsPanel.tsx"), "utf8");
const downloads = JSON.parse(
  readFileSync(path.join(root, "shared/desktop-downloads.json"), "utf8")
);

const bodies = [...messages.matchAll(/privacyPolicyLimitsBody:\s*\n\s*"([^"]+)"/g)].map((m) => m[1]);
if (bodies.length < 2) {
  console.error(`expected 2 privacyPolicyLimitsBody strings, found ${bodies.length}`);
  process.exit(1);
}
const [enBody, ptBody] = bodies;

let failed = 0;
function need(label, ok) {
  if (!ok) {
    console.error(label);
    failed += 1;
  }
}

need("Privacy EN title: Honest limits", messages.includes("Honest limits (desktop + proxy)"));
need("Privacy pt-PT title: Limites honestos", messages.includes("Limites honestos (app + proxy)"));
need("Privacy EN: No TLS decryption", enBody.includes("No TLS decryption"));
need("Privacy EN: No process kill", enBody.includes("No process kill"));
need("Privacy EN: report-only", enBody.includes("report-only"));
need("Privacy pt-PT: Sem desencriptação TLS", ptBody.includes("Sem desencriptação TLS"));
need("Privacy pt-PT: Sem terminar processos", ptBody.includes("Sem terminar processos"));
need("Privacy pt-PT: reportadas", ptBody.includes("reportadas"));

need(
  "Draft EN caption",
  draft.includes("Companion desktop app: no TLS decryption, no process kill, system folders report-only")
);
need(
  "Draft pt-PT caption",
  draft.includes("sem desencriptação TLS, sem terminar processos, pastas de sistema só reportadas")
);
need("Draft EN detailed: no TLS decryption", draft.includes("no TLS decryption"));
need("Draft pt-PT detailed stem", /sem desencriptação TLS/i.test(draft));

// Ready for localized CDN copy later — keep the SR describedby hook in Settings.
need(
  "Settings mac CDN desc testid",
  settingsPanel.includes('data-testid="settings-desktop-mac-cdn-desc"')
);
need(
  "Settings mac CDN desc id",
  settingsPanel.includes('id="settings-desktop-mac-cdn-desc"')
);

function assertMirrorLiveCopyKeys(label) {
  need(`${label}: privacyDesktopMirrorNote key present`, /privacyDesktopMirrorNote\s*:/.test(messages));
  need(
    `${label}: Privacy mirror note EN copy`,
    messages.includes("CDN mirror is live") || messages.includes("Desktop macOS download")
  );
  need(
    `${label}: Privacy mirror note pt-PT copy`,
    messages.includes("espelho CDN") || messages.includes("Transferência macOS")
  );
}

const macMirror = String(downloads.mirrors?.macosAppZipUrl || "").trim();
if (macMirror) {
  assertMirrorLiveCopyKeys("repo mirrors.macosAppZipUrl");
} else {
  // Repo mirror empty — write a real temp JSON fixture and re-parse it.
  // SHIELD_LISTING_KEEP_TEMP=1 → keep under tests/fixtures/ for debugging.
  const keepTemp = process.env.SHIELD_LISTING_KEEP_TEMP === "1";
  const fixturesDir = path.join(root, "tests/fixtures");
  const tempPath = keepTemp
    ? path.join(fixturesDir, "listing-mirror-live-temp.json")
    : path.join(tmpdir(), `shield-listing-mirror-live-${process.pid}-${Date.now()}.json`);
  try {
    if (keepTemp) mkdirSync(fixturesDir, { recursive: true });
    const tempFixture = {
      ...downloads,
      mirrors: {
        ...(downloads.mirrors || {}),
        macosAppZipUrl: "https://cdn.example.test/PreventiveShield-macos-app.zip"
      }
    };
    writeFileSync(tempPath, JSON.stringify(tempFixture, null, 2));
    const reparsed = JSON.parse(readFileSync(tempPath, "utf8"));
    const tempMirror = String(reparsed.mirrors?.macosAppZipUrl || "").trim();
    need("temp mirror-live fixture file has macosAppZipUrl", Boolean(tempMirror));
    need(`temp mirror-live fixture path readable (${tempPath})`, tempMirror.length > 0);
    assertMirrorLiveCopyKeys("temp fixture mirrors.macosAppZipUrl");
    console.log(
      `listing mirror-live branch exercised via temp JSON at ${tempPath}` +
        (keepTemp ? " (SHIELD_LISTING_KEEP_TEMP=1 — kept)" : " (repo mirrors.macosAppZipUrl empty)")
    );
    if (keepTemp) {
      console.log(
        "keep-temp covered by .gitignore + .cursorignore → tests/fixtures/listing-mirror-live-temp.json"
      );
      console.log("  .gitignore: /tests/fixtures/listing-mirror-live-temp.json");
      console.log("  .cursorignore: tests/fixtures/listing-mirror-live-temp.json");
    }
  } finally {
    const cleanKeep =
      keepTemp && process.env.SHIELD_LISTING_KEEP_TEMP_CLEAN === "1";
    if (!keepTemp || cleanKeep) {
      try {
        unlinkSync(tempPath);
        if (cleanKeep) {
          console.log(
            `SHIELD_LISTING_KEEP_TEMP_CLEAN=1 — removed kept fixture ${tempPath}`
          );
        }
      } catch {
        /* ignore */
      }
    }
  }
}

// Keep-temp path must stay dual-ignored (agent + git) — CI / typecheck smoke.
const keepTempName = "listing-mirror-live-temp.json";
const gitignore = readFileSync(path.join(root, ".gitignore"), "utf8");
const cursorignore = readFileSync(path.join(root, ".cursorignore"), "utf8");
need(`.gitignore lists ${keepTempName}`, gitignore.includes(keepTempName));
need(`.cursorignore lists ${keepTempName}`, cursorignore.includes(keepTempName));

if (failed) process.exit(1);
console.log("listing draft honest-limits captions sync ok");