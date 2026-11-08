/**
 * Halt survey blocks on live RiskResult (danger / ignore / next-steps / timing / report).
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 env -u PLAYWRIGHT_BROWSERS_PATH \
 *     npx playwright test playwright/halt-survey-blocks.spec.ts
 *
 * Offline stub of /api/check — same pattern as risk-result-desktop-block-live.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { submitHomeCheck } from "./helpers/spa-settings-nav";

const base = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");
const fixturePath = path.resolve("playwright/fixtures/leave-and-block.json");

async function baseReachable(): Promise<boolean> {
  try {
    const res = await fetch(base, { signal: AbortSignal.timeout(4000) });
    return res.status > 0;
  } catch {
    return false;
  }
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
          }
        ],
        limitations: ["Signals can produce false positives or false negatives."]
      },
      sensitive: null,
      inferredOrganisationId: null,
      live: null,
      timing: {
        parseMs: 1,
        threatMs: 2,
        probeMs: 3,
        riskMs: 1,
        totalMs: 7,
        probeTimeoutMs: 5000,
        probeHeadFailed: false,
        headSkipped: true,
        ambiguousProbeStatus: false
      }
    }
  };
}

test("Halt result shows survey Round-1 blocks", async ({ page }) => {
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
  await submitHomeCheck(page, fixture.url);
  await page.waitForSelector('[data-testid="result-action-row"]', { timeout: 20000 });

  await expect(page.getByTestId("result-danger-level")).toBeVisible();
  await expect(page.getByTestId("result-danger-level")).toContainText(/Danger level/i);
  await expect(page.getByTestId("result-ignore-risk")).toBeVisible();
  await expect(page.getByTestId("result-next-steps")).toBeVisible();
  await expect(page.getByTestId("result-honest-limits")).toBeVisible();
  await expect(page.getByTestId("result-report-website")).toBeVisible();
  await expect(page.getByTestId("halt-timing-chip")).toBeVisible();
  await expect(page.getByTestId("halt-timing-chip")).toContainText(/7\s*ms|check 7/i);
});
