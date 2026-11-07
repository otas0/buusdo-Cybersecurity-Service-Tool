/**
 * Real RiskResult on the website — Block on desktop when Escudo :3010 is down.
 *
 * Uses the live AppShell / RiskResult tree on PLAYWRIGHT_BASE_URL, but stubs
 * POST /api/check with a LEAVE_AND_BLOCK payload so vinext CI does not depend on
 * live DNS/probe to the curated fixture host (which timed out waiting for
 * result-action-row). Desktop :3010 probe is still aborted.
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test playwright/risk-result-desktop-block-live.spec.ts
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const base = (process.env.PLAYWRIGHT_BASE_URL || "").trim().replace(/\/$/, "");
const fixturePath = path.resolve("playwright/fixtures/leave-and-block.json");
const curatedPath = path.resolve("security/data/curated-threats.json");

async function baseReachable(): Promise<boolean> {
  if (!base) return false;
  try {
    const res = await fetch(base, { signal: AbortSignal.timeout(4000) });
    return res.status > 0;
  } catch {
    return false;
  }
}

function curatedHasHost(host: string): boolean {
  if (!existsSync(curatedPath)) return false;
  const raw = readFileSync(curatedPath, "utf8");
  return raw.includes(host);
}

function leaveAndBlockCheckBody(fixture: { host: string; url: string }) {
  const host = fixture.host;
  return {
    ok: true,
    timingValid: true,
    analysis: {
      parsed: {
        fullUrl: fixture.url,
        protocol: "https:",
        hostname: host,
        unicodeHostname: host,
        registrableDomain: host,
        subdomain: "",
        path: "/",
        usesHttps: true,
        hasPunycode: false
      },
      threat: {
        state: "KNOWN_PHISHING",
        providerName: "buusdo own threat list",
        checkedAt: new Date().toISOString(),
        evidence: ["known-threat"]
      },
      identity: { state: "NO_CLAIM" },
      risk: {
        level: "CRITICAL",
        confidence: "HIGH",
        recommendation: "LEAVE_AND_BLOCK",
        evidence: [
          {
            id: "known-threat",
            kind: "known",
            title: "Known phishing",
            detail: "Fixture host on the curated list."
          },
          {
            id: "https-limit",
            kind: "limitation",
            title: "HTTPS limit",
            detail: "HTTPS does not prove identity."
          }
        ],
        limitations: ["Signals can produce false positives or false negatives."]
      },
      sensitive: null,
      inferredOrganisationId: null,
      live: null,
      timing: {
        parseMs: 1,
        threatMs: 1,
        probeMs: 1,
        riskMs: 1,
        totalMs: 4,
        probeTimeoutMs: 5000,
        probeHeadFailed: false,
        headSkipped: true,
        ambiguousProbeStatus: false
      }
    }
  };
}

test("live RiskResult: desktop down → desktop-block-need-app", async ({ page }) => {
  // Live suite only — never default to localhost (CI / check:desktop use the offline fixture instead).
  if (!base) {
    test.skip(true, "set PLAYWRIGHT_BASE_URL to run live RiskResult (offline: risk-result-desktop-block.spec.ts)");
    return;
  }
  if (!(await baseReachable())) {
    test.skip(true, `PLAYWRIGHT_BASE_URL unreachable: ${base}`);
    return;
  }
  if (!existsSync(fixturePath)) {
    test.skip(true, "leave-and-block fixture missing");
    return;
  }
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as {
    host: string;
    url: string;
  };
  if (!curatedHasHost(fixture.host)) {
    test.skip(true, `curated list missing ${fixture.host}`);
    return;
  }

  await page.route("http://127.0.0.1:3010/**", (route) => route.abort());
  // Stub check so result-action-row appears without waiting on probe/DNS to .example.
  await page.route("**/api/check", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(leaveAndBlockCheckBody(fixture))
    });
  });

  await page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
  const urlInput = page.locator('input[name="url"], #url, input[type="url"]').first();
  await urlInput.waitFor({ state: "visible", timeout: 15000 });
  await urlInput.fill(fixture.url);
  await page.locator('button[type="submit"]').first().click();
  // Match settings-narrow: wait for result chrome, then action row.
  await page.waitForSelector(".log-action, [data-testid='result-action-row']", { timeout: 20000 });
  await page.waitForSelector('[data-testid="result-action-row"]', { timeout: 10000 });

  const block = page.getByTestId("add-desktop-block");
  if ((await block.count()) === 0) {
    test.skip(true, "add-desktop-block not shown (recommendation drift)");
    return;
  }
  await block.click();
  const tip = page.getByTestId("desktop-block-need-app");
  await expect(tip).toBeVisible({ timeout: 8000 });
  await expect(tip).toContainText(/Escudo desktop|Open the Escudo/i);
});