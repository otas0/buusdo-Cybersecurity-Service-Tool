/**
 * Quarantine restore-error rows: keyboard Tab → :focus-visible Halt outline
 * (no bare :focus mouse outline). Serves tokens + dashboard.css + a minimal fixture.
 *
 *   npx playwright test playwright/quarantine-focus-visible.spec.ts
 */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { assertSpaNavNoReload, trackDocumentLoads } from "./helpers/spa-settings-nav";

const root = path.resolve(".");
const cssPath = path.join(root, "desktop-app/public/css/dashboard.css");
const tokensPath = path.join(root, "shared/tokens.css");

test("restore-error row shows Halt outline on :focus-visible only", async ({ page }) => {
  if (!existsSync(cssPath) || !existsSync(tokensPath)) {
    test.skip(true, "dashboard.css or tokens.css missing");
    return;
  }

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="/tokens.css" />
  <link rel="stylesheet" href="/dashboard.css" />
</head>
<body style="background:#161616;padding:24px">
  <button type="button" id="focus-start" data-testid="focus-start">Start</button>
  <ul class="mini-log" id="machineQuarantine">
    <li tabindex="0" data-restore-error="1" data-testid="quarantine-restore-error">
      /tmp/fixture.bin — restore failed
    </li>
  </ul>
</body>
</html>`;

  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname === "/dashboard.css") {
      res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
      res.end(readFileSync(cssPath));
      return;
    }
    if (url.pathname === "/tokens.css") {
      res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
      res.end(readFileSync(tokensPath));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const { port } = server.address() as { port: number };

  try {
    // Fixture page — focus/Tab must not navigate away (document load count stays put).
    // waitUntil: "load" so trackDocumentLoads has already counted the initial navigation.
    const loads = trackDocumentLoads(page);
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load" });
    // Catch double-load early (e.g. unexpected redirect) before focus interactions.
    expect(loads.count).toBe(1);
    const afterGoto = loads.count;
    const row = page.getByTestId("quarantine-restore-error");
    await expect(row).toBeVisible();

    // Mouse click must not leave a persistent outline (focus-visible only).
    await row.click();
    const afterClick = await row.evaluate((el) => {
      const s = getComputedStyle(el);
      return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth };
    });
    expect(afterClick.outlineStyle === "none" || afterClick.outlineWidth === "0px").toBeTruthy();

    // Keyboard: focus preceding control, Tab into restore-error → :focus-visible Halt.
    await page.getByTestId("focus-start").focus();
    await page.keyboard.press("Tab");
    await expect(row).toBeFocused();
    const matches = await row.evaluate((el) => el.matches(":focus-visible"));
    expect(matches).toBe(true);
    const afterTab = await row.evaluate((el) => {
      const s = getComputedStyle(el);
      return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, outlineColor: s.outlineColor };
    });
    expect(afterTab.outlineStyle).not.toBe("none");
    expect(afterTab.outlineWidth).not.toBe("0px");
    // Halt #ff4d00
    expect(afterTab.outlineColor.replace(/\s/g, "")).toMatch(/255,\s*77,\s*0|ff4d00/i);
    assertSpaNavNoReload(loads.count, afterGoto);
  } finally {
    server.close();
  }
});