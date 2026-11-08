/**
 * Halt evidence bag — zh-Hans titles/details on a RiskResult-shaped fixture.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/risk-result-zh-hans-evidence.spec.ts
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();
const en = JSON.parse(readFileSync(path.join(root, "i18n/packs/_en.snapshot.json"), "utf8")) as Record<
  string,
  string
>;
const zh = JSON.parse(readFileSync(path.join(root, "i18n/packs/zh-Hans.json"), "utf8")) as Record<
  string,
  string
>;

function fill(template: string, vars: Record<string, string> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

test("zh-Hans Halt fixture shows Chinese evidence bag + probe-blocked", async ({ page }) => {
  const knownTitle = zh.evidenceKnownThreatTitle;
  const knownDetail = zh.evidenceKnownThreatDetail;
  const levelLabel = zh.riskLevelCritical;
  const probeTitle = zh.probeBlocked403Title;
  const probeDetail = zh.probeBlocked403Detail;
  expect(knownTitle).toBeTruthy();
  expect(levelLabel).toBeTruthy();
  expect(knownTitle).not.toEqual(en.evidenceKnownThreatTitle);
  expect(levelLabel).not.toEqual(en.riskLevelCritical);
  expect(probeTitle).not.toEqual(en.probeBlocked403Title);

  const html = `<!doctype html>
<html lang="zh-Hans">
<body>
  <div class="result-layout" data-testid="result-layout">
    <p class="result-verdict" data-testid="result-verdict">${escapeHtml(levelLabel)}</p>
    <p class="result-danger-level" data-testid="result-danger-level">
      <span class="danger-level-label">${escapeHtml(zh.dangerLevelLabel)}</span>:
      <strong>${escapeHtml(levelLabel)}</strong>
    </p>
    <ul class="why-list" data-testid="why-list">
      <li data-testid="evidence-known-threat">
        <strong data-testid="evidence-known-threat-title">${escapeHtml(knownTitle)}</strong>
        <span data-testid="evidence-known-threat-detail">${escapeHtml(fill(knownDetail))}</span>
      </li>
      <li data-testid="evidence-probe-blocked">
        <strong data-testid="evidence-probe-blocked-title">${escapeHtml(probeTitle)}</strong>
        <span data-testid="evidence-probe-blocked-detail">${escapeHtml(probeDetail)}</span>
      </li>
    </ul>
  </div>
</body>
</html>`;

  const server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  try {
    await page.goto(`http://127.0.0.1:${port}/`);
    await expect(page.getByTestId("result-verdict")).toContainText(/危|严重/);
    await expect(page.getByTestId("evidence-known-threat-title")).toContainText(/威胁|已知/);
    await expect(page.getByTestId("evidence-known-threat-detail")).toContainText(/列表|威胁/);
    await expect(page.getByTestId("evidence-probe-blocked-title")).toContainText(/拒绝|探测|网站/);
    await expect(page.getByTestId("evidence-probe-blocked-title")).not.toHaveText(en.probeBlocked403Title);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const liveBase = (
  process.env.PLAYWRIGHT_LIVE_BASE_URL ||
  process.env.PRODUCTION_HEALTH_URL ||
  process.env.STAGING_HEALTH_URL ||
  ""
)
  .trim()
  .replace(/\/$/, "");

async function liveReachable(): Promise<boolean> {
  if (!liveBase) return false;
  try {
    const res = await fetch(`${liveBase}/api/health`, {
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: "application/json" }
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { ok?: boolean; curatedListPresent?: boolean };
    return data?.ok === true && data?.curatedListPresent === true;
  } catch {
    return false;
  }
}

test.describe("live zh-Hans Halt evidence (soft)", () => {
  test.beforeAll(async () => {
    if (!liveBase) {
      test.skip(true, "Set PLAYWRIGHT_LIVE_BASE_URL or PRODUCTION_HEALTH_URL");
    }
    const ok = await liveReachable();
    if (!ok) {
      test.skip(true, `Origin unreachable: ${liveBase}`);
    }
  });

  test("known-threat Halt shows evidence-known-threat on /zh-Hans", async ({ page }) => {
    const fixture = JSON.parse(
      readFileSync(path.join(root, "security/data/fixtures/halt-known-threat.json"), "utf8")
    ) as { host: string };
    const curated = JSON.parse(
      readFileSync(path.join(root, "security/data/curated-threats.json"), "utf8")
    ) as { hosts: Record<string, string> };
    const host = (process.env.PLAYWRIGHT_HALT_HOST || fixture.host).trim();
    expect(curated.hosts[host], `fixture host ${host} must remain on curated list`).toBeTruthy();

    await page.goto(`${liveBase}/zh-Hans`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    const input = page
      .getByLabel(/地址|Website|address|网址/i)
      .or(page.locator('input[name="url"], input[type="url"], input[data-testid="check-url"]').first());
    await expect(input.first()).toBeVisible({ timeout: 20_000 });
    await input.first().fill(host);
    const go = page.getByRole("button", { name: /运行|Go|Run|檢查|检查/i }).first();
    await go.click();
    const evidence = page.getByTestId("evidence-known-threat");
    await expect(evidence).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("evidence-known-threat-title")).toContainText(/威胁|已知/);
  });
});
