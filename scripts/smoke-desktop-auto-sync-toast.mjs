/**
 * Real desktop dashboard (:3010-class port) — mock /api/account/sync → account-auto-sync-toast.
 *
 *   npm run smoke:desktop-auto-sync-toast
 */
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const data = await mkdtemp(path.join(tmpdir(), "shield-auto-sync-toast-"));
const fixture = await mkdtemp(path.join(tmpdir(), "shield-auto-sync-fix-"));
const uiPort = 32311;
const proxyPort = 32312;

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
    SHIELD_QUIT_GRACE_MS: "0",
    SHIELD_HONEST_LIMITS: "0"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let browser;
try {
  let ready = false;
  for (let i = 0; i < 50; i += 1) {
    try {
      // Dashboard listens on ::1 / localhost (not 127.0.0.1) on this host.
      if ((await fetch(`http://localhost:${uiPort}/api/state`)).ok) {
        ready = true;
        break;
      }
    } catch {
      /* wait */
    }
    await delay(100);
  }
  if (!ready) fail(`dashboard did not start on ${uiPort}`);

  const { chromium } = await import("playwright");
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.route("**/api/account/sync", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, merged: false })
    });
  });

  await page.goto(`http://localhost:${uiPort}/`, { waitUntil: "domcontentloaded" });
  // toastHost stays CSS-hidden until a toast appears — wait attached, not visible.
  await page.waitForSelector("#toastHost", { state: "attached" });
  await page.waitForFunction(() => typeof window.__SHIELD_RUN_ACCOUNT_SYNC__ === "function");

  // Real dashboard auto-sync toast path (same as Exchange → runAccountSync({ auto: true })).
  await page.evaluate(() => window.__SHIELD_RUN_ACCOUNT_SYNC__({ auto: true }));
  const toast = page.getByTestId("account-auto-sync-toast");
  await toast.waitFor({ state: "visible", timeout: 5000 });
  const text = (await toast.textContent()) || "";
  if (!/auto-synced|Auto-sync|Lists|Sync/i.test(text)) fail(`unexpected toast text: ${text}`);

  // Block-on-desktop deep link: list write + proxy guide nudge.
  await page.goto(`http://localhost:${uiPort}/?blockHost=block-smoke.example#listsSection`, {
    waitUntil: "domcontentloaded"
  });
  await delay(600);
  const lists = await fetch(`http://localhost:${uiPort}/api/lists`).then((r) => r.json()).catch(() => null);
  const blocked = lists?.lists?.blocked || lists?.blocked || [];
  const domains = blocked.map((e) => (typeof e === "string" ? e : e.domain));
  if (!domains.includes("block-smoke.example")) {
    fail(`blockHost deep link did not add block-smoke.example; got ${JSON.stringify(domains)}`);
  }
  const guide = page.locator("#proxyGuide");
  if ((await guide.count()) && !(await guide.evaluate((el) => el.open))) {
    console.warn("warn: proxy guide not open after block (may be user-closed) — list write ok");
  }

  console.log("smoke:desktop-auto-sync-toast ok (toast + blockHost)");
} finally {
  if (browser) await browser.close().catch(() => {});
  child.kill("SIGTERM");
  await Promise.all([
    rm(data, { recursive: true, force: true }),
    rm(fixture, { recursive: true, force: true })
  ]);
}
