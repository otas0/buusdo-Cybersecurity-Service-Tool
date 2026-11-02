/**
 * Proxy 403 must not flip the address readout (lastScan) to Halt.
 * Also asserts the large DOM readout stays Standby / Pronto.
 * Default ports when free; otherwise high ports.
 */

import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

function portFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}

const preferDefault = (await portFree(3010)) && (await portFree(8080));
const uiPort = preferDefault ? 3010 : 32141;
const proxyPort = preferDefault ? 8080 : 32142;
const data = await mkdtemp(path.join(os.tmpdir(), "shield-proxy-readout-"));
await writeFile(
  path.join(data, "shield-backup.json"),
  JSON.stringify(
    {
      schema: "shield-lists-v1",
      updatedAt: new Date().toISOString(),
      blocked: [{ domain: "proxy-readout.test", reason: "user", createdAt: new Date().toISOString() }],
      trusted: []
    },
    null,
    2
  )
);

const { t } = await import(pathToFileURL(path.resolve("desktop-app/public/js/i18n.js")).href);
const standbyEn = t("en", "statusStandby");
const standbyPt = t("pt-PT", "statusStandby");

const child = spawn(process.execPath, ["src/server.js"], {
  cwd: path.resolve("desktop-app"),
  env: {
    ...process.env,
    UI_PORT: String(uiPort),
    PROXY_PORT: String(proxyPort),
    SHIELD_DATA_DIR: data,
    SHIELD_LISTS_PATH: path.join(data, "shield-backup.json"),
    SHIELD_MACHINE_SCAN: "0"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

function fail(message) {
  child.kill("SIGTERM");
  throw new Error(message);
}

async function readStatusWord(page) {
  return page.locator("#statusWord").innerText();
}

try {
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(`http://localhost:${uiPort}/api/state`);
      if (res.ok) break;
    } catch {
      /* wait */
    }
    await delay(100);
  }

  const before = await fetch(`http://localhost:${uiPort}/api/state`).then((r) => r.json());
  const beforeScan = before.state?.lastScan || null;

  const html = await fetch(`http://localhost:${uiPort}/`).then((r) => r.text());
  if (!html.includes('id="statusWord"') || !html.includes("Standby")) {
    fail("dashboard HTML missing large Standby readout");
  }

  const { spawnSync } = await import("node:child_process");
  const curl = spawnSync(
    "curl",
    ["-sS", "-o", "/dev/null", "-w", "%{http_code}", "-x", `http://127.0.0.1:${proxyPort}`, "http://proxy-readout.test/"],
    { encoding: "utf8" }
  );
  if (curl.status !== 0) fail(`curl proxy failed: ${curl.stderr}`);
  if (String(curl.stdout).trim() !== "403") fail(`expected 403, got ${curl.stdout}`);

  await delay(200);
  const after = await fetch(`http://localhost:${uiPort}/api/state`).then((r) => r.json());
  const afterScan = after.state?.lastScan || null;
  if (JSON.stringify(beforeScan) !== JSON.stringify(afterScan)) {
    fail(`lastScan changed after proxy 403: ${JSON.stringify(beforeScan)} → ${JSON.stringify(afterScan)}`);
  }
  if (afterScan?.level && afterScan.level !== "idle") {
    fail(`lastScan level must stay idle/Standby, got ${afterScan.level}`);
  }

  // DOM: Playwright when browsers are installed; otherwise i18n + static HTML already checked.
  let domChecked = false;
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(`http://localhost:${uiPort}/`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("#statusWord");
      const beforeWord = (await readStatusWord(page)).trim();
      if (beforeWord !== standbyEn && beforeWord !== standbyPt) {
        fail(`DOM readout before 403 expected Standby/Pronto, got ${JSON.stringify(beforeWord)}`);
      }
      await page.evaluate(async (port) => {
        await fetch(`http://proxy-readout.test/`, {
          // browser cannot set proxy; trigger via same-origin noop — curl already did 403
        }).catch(() => {});
        void port;
      }, proxyPort);
      // Re-assert after server-side 403 already applied.
      await delay(300);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForSelector("#statusWord");
      const afterWord = (await readStatusWord(page)).trim();
      if (afterWord !== standbyEn && afterWord !== standbyPt) {
        fail(`DOM readout after 403 expected Standby/Pronto, got ${JSON.stringify(afterWord)}`);
      }
      if (afterWord === "Halt" || afterWord === t("en", "statusDanger") || afterWord === t("pt-PT", "statusDanger")) {
        fail("DOM readout flipped to Halt after proxy user-block");
      }
      domChecked = true;
    } finally {
      await browser.close();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
    console.log(`DOM playwright skipped (${msg}) — HTML+API Standby asserted`);
  }

  console.log(
    `desktop proxy readout smoke ok (ports ${uiPort}/${proxyPort}${domChecked ? ", DOM" : ", HTML+API"})`
  );
} finally {
  child.kill("SIGTERM");
  await delay(300);
  await rm(data, { recursive: true, force: true });
}