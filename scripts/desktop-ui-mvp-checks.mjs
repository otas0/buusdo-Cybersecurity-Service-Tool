/**
 * MVP polish checks (temp fixture — never block the real home).
 *
 *   npm run smoke:desktop-ui-mvp
 */

import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const require = createRequire(import.meta.url);
const { shouldFocusAskDecline, hashFocusOnlyScrolls } = require("../desktop-app/src/machine-focus.js");

const data = await mkdtemp(path.join(os.tmpdir(), "shield-ui-mvp-"));
const fixture = await mkdtemp(path.join(os.tmpdir(), "shield-ui-mvp-fix-"));
const uiPort = 32161;
const proxyPort = 32162;

await mkdir(path.join(fixture, "Downloads"), { recursive: true });
await writeFile(path.join(fixture, "Downloads", "invoice.pdf.exe"), "");
await writeFile(
  path.join(data, "shield-backup.json"),
  JSON.stringify({
    schema: "shield-lists-v1",
    updatedAt: new Date().toISOString(),
    blocked: [{ domain: "proxy-readout.test", reason: "user", createdAt: new Date().toISOString() }],
    trusted: []
  })
);

function fail(message) {
  throw new Error(message);
}

const child = spawn(process.execPath, ["src/server.js"], {
  cwd: path.resolve("desktop-app"),
  env: {
    ...process.env,
    UI_PORT: String(uiPort),
    PROXY_PORT: String(proxyPort),
    SHIELD_DATA_DIR: data,
    SHIELD_LISTS_PATH: path.join(data, "shield-backup.json"),
    SHIELD_QUARANTINE_PATH: path.join(data, "quarantine"),
    SHIELD_MACHINE_DECISION_PATH: path.join(data, "machine-decision.json"),
    SHIELD_MACHINE_SCAN_ROOT: fixture,
    SHIELD_MACHINE_SCAN_SYSTEM: "0",
    SHIELD_HONEST_LIMITS: "0",
    SHIELD_QUIT_GRACE_MS: "0"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

try {
  for (let i = 0; i < 50; i += 1) {
    try {
      if ((await fetch(`http://localhost:${uiPort}/api/state`)).ok) break;
    } catch {
      /* wait */
    }
    await delay(100);
  }

  const state = await fetch(`http://localhost:${uiPort}/api/state`).then((r) => r.json());
  if (!state.dataDir) fail("dataDir missing from /api/state");
  const beforeScan = state.state?.lastScan ?? null;

  const i18nSrc = await readFile(path.resolve("desktop-app/public/js/i18n.js"), "utf8");
  if (!i18nSrc.includes("original path is already occupied")) fail("EN destination-exists string missing");
  if (!i18nSrc.includes("o caminho original já está ocupado")) fail("pt-PT destination-exists string missing");

  if (!hashFocusOnlyScrolls({ askVisible: true, alreadyOpen: true })) {
    fail("hash should only-scroll when ask open");
  }
  if (shouldFocusAskDecline({ askVisible: true, alreadyOpen: true })) {
    fail("must not re-focus ask when already open");
  }

  const dash = await readFile(path.resolve("desktop-app/public/js/dashboard.js"), "utf8");
  if (!dash.includes("window.prompt")) fail("dataDir copy must fall back to prompt()");
  if (!dash.includes("dataDirCopiedClipboard") || !dash.includes("dataDirCopiedPrompt")) {
    fail("dataDir copy must report clipboard vs prompt status distinctly");
  }
  if (!i18nSrc.includes("dataDirCopiedClipboard") || !i18nSrc.includes("dataDirCopiedPrompt")) {
    fail("i18n missing dataDirCopiedClipboard / dataDirCopiedPrompt");
  }
  if (!dash.includes("diagnosticsPathCopiedClipboard") || !dash.includes("openProxyGuideForPlatform")) {
    fail("diagnostics Copy path + proxy guide platform open must be wired");
  }
  if (!i18nSrc.includes("diagnosticsCopyPath") || !i18nSrc.includes("diagnosticsPathCopiedClipboard")) {
    fail("i18n missing diagnostics Copy path strings");
  }
  if (!dash.includes("halt-outline") || !dash.includes("is-primary")) {
    fail("Export diagnostics Halt outline + Scan again primary after skip must be wired");
  }
  if (!dash.includes("proxyGuideUserClosed") || !dash.includes("/api/diagnostics/reveal")) {
    fail("proxy guide user-closed memory + diagnostics reveal must be wired");
  }
  if (!dash.includes("shieldProxyGuideUserClosed") || !dash.includes("machineRescanPrimaryHint")) {
    fail("proxyGuide sessionStorage key + Scan again aria-describedby hint must be wired");
  }
  if (!dash.includes("proxyGuideShow") || !dash.includes("syncMachineGateButtons")) {
    fail("Show proxy guide control + gate-disabled Continue/Block again must be wired");
  }
  const indexHtml = await readFile(path.resolve("desktop-app/public/index.html"), "utf8");
  if (!indexHtml.includes('aria-live="polite"') || !indexHtml.includes("machineRescanPrimaryHint")) {
    fail("Scan again primary hint must be a polite live region in index.html");
  }
  if (!indexHtml.includes('data-testid="proxy-guide-show"')) {
    fail("Show proxy guide control missing from index.html");
  }

  const curl = spawnSync(
    "curl",
    [
      "-sS",
      "-o",
      "/dev/null",
      "-w",
      "%{http_code}",
      "-x",
      `http://127.0.0.1:${proxyPort}`,
      "http://proxy-readout.test/"
    ],
    { encoding: "utf8" }
  );
  if (String(curl.stdout).trim() !== "403") fail(`expected 403 got ${curl.stdout}`);
  await delay(200);
  const after = await fetch(`http://localhost:${uiPort}/api/state`).then((r) => r.json());
  if (JSON.stringify(after.state?.lastScan ?? null) !== JSON.stringify(beforeScan)) {
    fail("lastScan changed after proxy user-block 403 (readout must stay Standby)");
  }
  if (after.state?.lastScan?.level === "halt" || after.state?.lastScan?.level === "Halt") {
    fail("lastScan level became Halt from proxy alone");
  }

  let trayResolved = false;
  try {
    require.resolve("systray2", { paths: [path.resolve("desktop-app")] });
    trayResolved = true;
  } catch {
    trayResolved = false;
  }
  if (!trayResolved && after.trayAvailable !== false) {
    fail("expected trayAvailable false when systray2 is not installed");
  }
  if (trayResolved && after.trayAvailable !== true) {
    fail(`expected trayAvailable true when systray2 resolves (got ${after.trayAvailable})`);
  }

  console.log("desktop ui mvp checks ok");
} finally {
  child.kill("SIGTERM");
  await delay(400);
  await rm(data, { recursive: true, force: true });
  await rm(fixture, { recursive: true, force: true });
}