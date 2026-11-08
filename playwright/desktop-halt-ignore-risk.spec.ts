/**
 * Desktop Halt: danger-level + ignore-risk after website-check maps to danger.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/desktop-halt-ignore-risk.spec.ts
 */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

const root = path.resolve(".");
const indexPath = path.join(root, "desktop-app/public/index.html");
const i18nPath = path.join(root, "desktop-app/public/js/i18n.js");
const cssPath = path.join(root, "desktop-app/public/css/dashboard.css");

test("desktop Halt shows result-ignore-risk after danger readout", async ({ page }) => {
  if (!existsSync(indexPath) || !existsSync(i18nPath)) {
    test.skip(true, "desktop index/i18n missing");
    return;
  }

  const { t } = await import(pathToFileURL(i18nPath).href);
  expect(t("en", "ignoreRiskTitle")).toMatch(/ignore/i);
  expect(t("en", "dangerLevelLabel")).toMatch(/Danger level/i);

  const indexHtml = readFileSync(indexPath, "utf8");
  const bodyMatch = indexHtml.match(/<p class="readout"[\s\S]*?<\/section>\s*<nav class="primary-path"/);
  expect(bodyMatch).toBeTruthy();
  const fragment = bodyMatch![0].replace(/<nav class="primary-path"/, "");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="/dashboard.css" />
</head>
<body>
${fragment}
<script type="module">
  import { t } from "/i18n.js";
  const lang = "en";
  const danger = document.getElementById("resultDangerLevel");
  const ignore = document.getElementById("resultIgnoreRisk");
  const title = document.getElementById("resultIgnoreRiskTitle");
  const body = document.getElementById("resultIgnoreRiskBody");
  const readout = document.getElementById("readout");
  const word = document.getElementById("statusWord");
  // Simulate setReadout("danger") / setHaltSurveyBlocks(true)
  readout.dataset.level = "danger";
  word.textContent = t(lang, "statusDanger");
  danger.hidden = false;
  danger.textContent = t(lang, "dangerLevelLabel") + ": " + t(lang, "statusDanger");
  ignore.hidden = false;
  title.textContent = t(lang, "ignoreRiskTitle");
  body.textContent = t(lang, "ignoreRiskBody");
</script>
</body>
</html>`;

  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname === "/i18n.js") {
      res.writeHead(200, { "Content-Type": "text/javascript" });
      res.end(readFileSync(i18nPath));
      return;
    }
    if (url.pathname === "/dashboard.css" && existsSync(cssPath)) {
      res.writeHead(200, { "Content-Type": "text/css" });
      res.end(readFileSync(cssPath));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  try {
    await page.goto(`http://127.0.0.1:${port}/`);
    await expect(page.getByTestId("result-danger-level")).toBeVisible();
    await expect(page.getByTestId("result-danger-level")).toContainText(/Danger level:\s*Halt/i);
    await expect(page.getByTestId("result-ignore-risk")).toBeVisible();
    await expect(page.getByTestId("result-ignore-risk")).toContainText(/passwords|payment/i);
    await expect(page.locator("#readout")).toHaveAttribute("data-level", "danger");
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});
