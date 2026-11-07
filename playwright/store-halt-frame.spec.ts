/**
 * Cross-check Halt readout fixture (Chromium) vs committed Sharp FRAME.
 * Structural hash floors — never overwrites Sharp FRAME unless STORE_HALT_OVERWRITE=1.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/store-halt-frame.spec.ts
 */
import { createServer } from "node:http";
import { readFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  haltFrameStats,
  assertHaltFrameFloors,
  assertHaltFrameRelativeFloor,
} from "../scripts/store-halt-frame-stats.mjs";

const root = process.cwd();
const wordmark = readFileSync(
  join(root, "public/brand/buusdo-wordmark.png"),
).toString("base64");
const markHalt = readFileSync(
  join(root, "public/brand/buusdo-mark-halt.svg"),
  "utf8",
);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>buusdo Cybersecurity Service Tool</title>
  <style>
    :root {
      --bg: #0e0e0e;
      --text: #f3f1ea;
      --muted: #8d897f;
      --line: rgba(243, 241, 234, 0.16);
      --halt: #ff4d00;
      --font: "Helvetica Neue", Helvetica, Arial, sans-serif;
      --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
    }
    .shell { max-width: 920px; margin: 0 auto; padding: 28px 28px 48px; }
    .top {
      display: flex; align-items: baseline; justify-content: space-between;
      padding: 0 0 18px; border-bottom: 1px solid var(--line);
    }
    .brand-logo {
      display: block; height: 40px; width: auto; background: transparent; border: 0;
    }
    .kicker {
      margin: 36px 0 14px;
      font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em;
      text-transform: uppercase; color: var(--muted);
    }
    .readout { display: flex; flex-direction: column; align-items: flex-start; gap: 16px; margin: 0; }
    .readout .mark {
      width: 10px; height: 10px; border: 0;
      background-color: var(--halt);
      -webkit-mask: url("data:image/svg+xml;utf8,${encodeURIComponent(markHalt)}") center / contain no-repeat;
      mask: url("data:image/svg+xml;utf8,${encodeURIComponent(markHalt)}") center / contain no-repeat;
    }
    .readout .word {
      font-size: 64px; line-height: 0.95; font-weight: 450; letter-spacing: -0.04em;
      color: var(--halt); margin: 0;
    }
    .detail { margin: 16px 0 0; max-width: 42ch; color: var(--muted); font-size: 15px; line-height: 1.45; }
    .host {
      font-family: var(--mono); font-size: 12px; letter-spacing: 0.08em;
      color: var(--text); margin: 18px 0 0;
    }
  </style>
</head>
<body>
  <main class="shell" data-testid="store-halt-frame">
    <header class="top">
      <img class="brand-logo" width="117" height="40" alt="buusdo Cybersecurity Service Tool"
        src="data:image/png;base64,${wordmark}" />
      <span class="kicker" style="margin:0">EN</span>
    </header>
    <p class="kicker">Result</p>
    <p class="readout" data-level="danger" role="status">
      <span class="mark" aria-hidden="true"></span>
      <span class="word">Halt</span>
    </p>
    <p class="host">login-micros0ft-security.example</p>
    <p class="detail">Own threat list and brand-impersonation signals matched. Do not enter credentials.</p>
  </main>
</body>
</html>`;

test("cross-check Chrome store Halt FRAME (Playwright vs Sharp floors)", async ({
  page,
}) => {
  const committed = join(root, "docs/store-screenshots/FRAME-formal-name.png");
  expect(existsSync(committed), "committed Sharp FRAME-formal-name.png missing").toBeTruthy();
  expect(statSync(committed).size).toBeGreaterThan(8_000);

  const sharpStats = await haltFrameStats(committed);
  const sharpFails = assertHaltFrameFloors(sharpStats, "sharp");
  expect(sharpFails, sharpFails.join("; ")).toEqual([]);

  const server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  const outDir = join(root, "docs/store-screenshots");
  mkdirSync(outDir, { recursive: true });
  const crossPath = join(outDir, "FRAME-formal-name.playwright.png");
  const overwrite = process.env.STORE_HALT_OVERWRITE === "1";
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`http://127.0.0.1:${port}/`);
    await expect(page.getByTestId("store-halt-frame")).toBeVisible();
    await expect(page.getByText("Halt")).toBeVisible();
    await expect(
      page.getByRole("img", { name: "buusdo Cybersecurity Service Tool" }),
    ).toBeVisible();
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toMatch(/rgb\(\s*14,\s*14,\s*14\s*\)|#0e0e0e/i);
    await page.screenshot({ path: crossPath, type: "png" });
    if (overwrite) {
      await page.screenshot({ path: committed, type: "png" });
    }

    const pwStats = await haltFrameStats(crossPath);
    const pwFails = assertHaltFrameFloors(pwStats, "playwright");
    expect(pwFails, pwFails.join("; ")).toEqual([]);
    const relFails = assertHaltFrameRelativeFloor(sharpStats, pwStats);
    expect(relFails, relFails.join("; ")).toEqual([]);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
});
