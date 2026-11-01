/**
 * Account + list domain fields: no white fill, light type, Halt :focus-visible.
 * Fixture serves tokens + dashboard.css (no desktop server required).
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/desktop-account-field-contrast.spec.ts
 */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const root = path.resolve(".");
const cssPath = path.join(root, "desktop-app/public/css/dashboard.css");
const tokensPath = path.join(root, "shared/tokens.css");
const indexPath = path.join(root, "desktop-app/public/index.html");

function isNearWhite(bg: string): boolean {
  const m = bg.replace(/\s/g, "").match(/rgba?\((\d+),(\d+),(\d+)/i);
  if (!m) return /#fff|#ffffff|white/i.test(bg);
  const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return r >= 240 && g >= 240 && b >= 240;
}

function isLightText(color: string): boolean {
  const m = color.replace(/\s/g, "").match(/rgba?\((\d+),(\d+),(\d+)/i);
  if (!m) return /#f3f1ea|f3f1ea/i.test(color);
  const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
  // --text #f3f1ea ≈ rgb(243,241,234)
  return r + g + b >= 600;
}

test("Account + listDomain field-input: dark field, light type, Halt focus", async ({ page }) => {
  if (!existsSync(cssPath) || !existsSync(tokensPath) || !existsSync(indexPath)) {
    test.skip(true, "dashboard assets missing");
    return;
  }

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="/tokens.css" />
  <link rel="stylesheet" href="/dashboard.css" />
</head>
<body style="background:#0e0e0e;padding:24px;color:#f3f1ea">
  <button type="button" id="focus-start">Start</button>
  <section class="account">
    <div class="list-add account-row">
      <input id="accountEmail" class="field-input" type="email" placeholder="you@example.com" />
      <button type="button">Send link</button>
    </div>
    <div class="list-add account-row">
      <input id="accountDeviceCode" class="field-input" type="text" placeholder="Device code" />
      <button type="button">Exchange code</button>
    </div>
  </section>
  <section class="lists">
    <form class="list-add">
      <input id="listDomain" class="field-input" type="text" placeholder="example.com" />
    </form>
  </section>
  <p class="hint lists-path" id="hintSample">hint sample</p>
</body>
</html>`;

  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname === "/dashboard.css") {
      res.writeHead(200, { "Content-Type": "text/css" });
      res.end(readFileSync(cssPath));
      return;
    }
    if (url.pathname === "/tokens.css") {
      res.writeHead(200, { "Content-Type": "text/css" });
      res.end(readFileSync(tokensPath));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };

  try {
    await page.goto(`http://127.0.0.1:${port}/`);
    for (const id of ["accountEmail", "accountDeviceCode", "listDomain"]) {
      const styles = await page.locator(`#${id}`).evaluate((el) => {
        const s = getComputedStyle(el);
        return { bg: s.backgroundColor, color: s.color };
      });
      expect(isNearWhite(styles.bg), `${id} must not be white fill (${styles.bg})`).toBe(false);
      expect(isLightText(styles.color), `${id} text must be light (${styles.color})`).toBe(true);
    }

    const indexHtml = readFileSync(indexPath, "utf8");
    expect(indexHtml).toContain('class="field-input"');
    expect(indexHtml).toMatch(/account-row/);
    expect(indexHtml).toMatch(/\?v=0\.2\.0/);

    const hintColor = await page.locator("#hintSample").evaluate((el) => getComputedStyle(el).color);
    // #a39e93 ≈ rgb(163, 158, 147)
    expect(hintColor.replace(/\s/g, "")).toMatch(/163,\s*158,\s*147/);

    await page.locator("#focus-start").focus();
    await page.keyboard.press("Tab");
    await expect(page.locator("#accountEmail")).toBeFocused();
    const focus = await page.locator("#accountEmail").evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        visible: el.matches(":focus-visible"),
        outlineColor: s.outlineColor,
        outlineWidth: s.outlineWidth
      };
    });
    expect(focus.visible).toBe(true);
    expect(focus.outlineWidth).not.toBe("0px");
    expect(focus.outlineColor.replace(/\s/g, "")).toMatch(/255,\s*77,\s*0|ff4d00/i);

    const scheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
    expect(scheme).toMatch(/dark/i);
  } finally {
    server.close();
  }
});
