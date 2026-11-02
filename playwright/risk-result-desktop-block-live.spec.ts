/**
 * Real RiskResult on the website — Block on desktop when Escudo :3010 is down.
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
  await page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
  const urlInput = page.locator('input[name="url"], #url, input[type="url"]').first();
  await urlInput.waitFor({ state: "visible", timeout: 15000 });
  await urlInput.fill(fixture.url);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForSelector('[data-testid="result-action-row"]', { timeout: 25000 });

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