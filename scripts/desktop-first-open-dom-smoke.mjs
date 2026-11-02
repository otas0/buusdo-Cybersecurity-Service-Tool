/**
 * First-open polish (no SHIELD_HONEST_LIMITS):
 * Skip → Scan again Halt primary; Export Halt outline on Never store;
 * Copy path after export; proxy guide opens only current OS details.
 *
 *   npm run smoke:desktop-first-open
 */

import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const data = await mkdtemp(path.join(tmpdir(), "shield-first-open-data-"));
const fixture = await mkdtemp(path.join(tmpdir(), "shield-first-open-fix-"));
const uiPort = 32211;
const proxyPort = 32212;

await mkdir(path.join(fixture, "Downloads"), { recursive: true });
await writeFile(path.join(fixture, "Downloads", "note.txt"), "ok\n");

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
    SHIELD_QUIT_GRACE_MS: "0"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

try {
  let ready = false;
  for (let i = 0; i < 50; i += 1) {
    try {
      if ((await fetch(`http://localhost:${uiPort}/api/state`)).ok) {
        ready = true;
        break;
      }
    } catch {
      /* wait */
    }
    await delay(100);
  }
  if (!ready) fail(`dashboard did not start on localhost:${uiPort}`);

  const state = await fetch(`http://localhost:${uiPort}/api/state`).then((r) => r.json());
  if (!state.honestLimitsPending) fail("expected honestLimitsPending");
  const platform = state.platform || process.platform;

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${uiPort}/`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-testid=honest-limits-gate]");

    // Gate pending → Scan again disabled; Continue / Block again hidden
    const rescanDisabled = await page.locator("#machineRescan").isDisabled();
    if (!rescanDisabled) fail("#machineRescan must be disabled while honest-limits gate is pending");
    const blockHidden = await page.locator("#machineBlockAgain").isHidden();
    if (!blockHidden) fail("#machineBlockAgain must be hidden while honest-limits gate is pending");
    const continueHidden = await page.locator("#machineContinue").isHidden();
    if (!continueHidden) fail("#machineContinue must be hidden while honest-limits gate is pending");
    const livePolite = await page.locator("#machineRescanPrimaryHint").getAttribute("aria-live");
    if (livePolite !== "polite") fail("#machineRescanPrimaryHint must be aria-live=polite");

    // Privacy Never store → Export Halt outline
    const outline = await page.locator("#diagnosticsExport").evaluate((el) => el.classList.contains("halt-outline"));
    if (!outline) fail("Export diagnostics missing halt-outline under Never store");

    // Proxy guide: only current OS nested details open
    const osOpen = await page.evaluate((plat) => {
      const mac = document.getElementById("proxyGuideMacDetails");
      const win = document.getElementById("proxyGuideWinDetails");
      const linux = document.getElementById("proxyGuideLinuxDetails");
      const want = plat === "darwin" ? "mac" : plat === "win32" ? "win" : "linux";
      return {
        guide: document.getElementById("proxyGuide")?.open === true,
        mac: Boolean(mac?.open),
        win: Boolean(win?.open),
        linux: Boolean(linux?.open),
        want
      };
    }, platform);
    if (!osOpen.guide) fail("proxyGuide should default open");
    const openCount = [osOpen.mac, osOpen.win, osOpen.linux].filter(Boolean).length;
    if (openCount !== 1) fail(`expected exactly one OS details open, got ${JSON.stringify(osOpen)}`);
    if (osOpen.want === "mac" && !osOpen.mac) fail("macOS details should be open");
    if (osOpen.want === "win" && !osOpen.win) fail("Windows details should be open");
    if (osOpen.want === "linux" && !osOpen.linux) fail("Linux details should be open");

    // Dismiss gate first (modal intercepts pointer events over the board).
    await page.getByTestId("honest-limits-skip").click();
    await page.getByTestId("honest-limits-gate").waitFor({ state: "hidden", timeout: 10_000 });
    await page.waitForFunction(() => document.getElementById("machineRescan")?.classList.contains("is-primary"));
    const primaryMeta = await page.locator("#machineRescan").evaluate((el) => ({
      primary: el.classList.contains("is-primary"),
      describedBy: el.getAttribute("aria-describedby"),
      disabled: el.disabled
    }));
    if (!primaryMeta.primary) fail("Scan again should be Halt primary after skip");
    if (primaryMeta.disabled) fail("Scan again must be enabled after skip");
    if (primaryMeta.describedBy !== "machineRescanPrimaryHint") {
      fail("Scan again primary must set aria-describedby=machineRescanPrimaryHint");
    }

    // User-closed outer details must stay closed across lang switch + sessionStorage
    await page.locator("#proxyGuide > summary").click();
    await page.waitForFunction(() => !document.getElementById("proxyGuide")?.open);
    await page.waitForFunction(() => sessionStorage.getItem("shieldProxyGuideUserClosed") === "1", null, {
      timeout: 5000
    });
    await page.getByTestId("proxy-guide-show").waitFor({ state: "visible" });
    await page.selectOption("#langSelect", "pt-PT");
    await delay(200);
    const stillClosed = await page.evaluate(() => !document.getElementById("proxyGuide")?.open);
    if (!stillClosed) fail("proxyGuide reopened after lang switch");

    // Reload keeps guide closed via sessionStorage
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => sessionStorage.getItem("shieldProxyGuideUserClosed") === "1");
    await page.waitForFunction(() => !document.getElementById("proxyGuide")?.open, null, { timeout: 5000 });

    // Only Show proxy guide clears the flag
    await page.getByTestId("proxy-guide-show").click();
    await page.waitForFunction(() => sessionStorage.getItem("shieldProxyGuideUserClosed") !== "1");
    await page.waitForFunction(() => document.getElementById("proxyGuide")?.open === true);

    await page.getByTestId("diagnostics-export").click();
    await page.getByTestId("diagnostics-copy-path").waitFor({ state: "visible", timeout: 5000 });
    await page.getByTestId("diagnostics-reveal").waitFor({ state: "visible", timeout: 5000 });

    // Scan again → drop primary once status ≠ idle; live region must clear
    await page.getByTestId("machine-rescan").click();
    await page.waitForFunction(() => {
      const btn = document.getElementById("machineRescan");
      const hint = document.getElementById("machineRescanPrimaryHint");
      return (
        btn &&
        !btn.classList.contains("is-primary") &&
        hint &&
        (hint.textContent || "") === "" &&
        hint.hidden === true
      );
    }, null, { timeout: 15_000 });
  } finally {
    await browser.close();
  }

  // Settings contract: ack then PUT must keep honestLimitsAckAt
  const ack = await fetch(`http://localhost:${uiPort}/api/honest-limits/ack`, { method: "POST" });
  const ackBody = await ack.json();
  if (!ack.ok || !ackBody?.ok) fail(`ack failed: ${ackBody?.error}`);
  const stamped = ackBody.settings?.honestLimitsAckAt;
  if (!stamped) fail("ack response missing honestLimitsAckAt");
  const put = await fetch(`http://localhost:${uiPort}/api/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ openAtLogin: false })
  });
  const putBody = await put.json();
  if (!put.ok || !putBody?.ok) fail(`PUT /api/settings failed: ${putBody?.error}`);
  if (putBody.settings?.honestLimitsAckAt !== stamped) {
    fail("PUT /api/settings dropped honestLimitsAckAt");
  }

  console.log("desktop first-open DOM smoke ok");
} finally {
  child.kill("SIGTERM");
  await delay(400);
  await rm(data, { recursive: true, force: true });
  await rm(fixture, { recursive: true, force: true });
}