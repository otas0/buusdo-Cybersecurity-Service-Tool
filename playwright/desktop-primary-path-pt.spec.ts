/**
 * Primary-path CTA copy — Scan + Check web (Account sync cancelled).
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/desktop-primary-path-pt.spec.ts
 */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

const root = path.resolve(".");
const indexPath = path.join(root, "desktop-app/public/index.html");
const i18nPath = path.join(root, "desktop-app/public/js/i18n.js");

test("pt-PT primary-path scan + check CTAs", async ({ page }) => {
  if (!existsSync(indexPath) || !existsSync(i18nPath)) {
    test.skip(true, "desktop index/i18n missing");
    return;
  }

  const { t } = await import(pathToFileURL(i18nPath).href);
  expect(t("pt-PT", "pathScanMachine")).toBe("Analisar este computador");
  expect(t("pt-PT", "pathCheckWeb")).toBe("Verificar um site");

  const indexHtml = readFileSync(indexPath, "utf8");
  const fragment = indexHtml.match(/<nav class="primary-path"[\s\S]*?<\/nav>/)?.[0];
  expect(fragment).toBeTruthy();
  expect(fragment).not.toMatch(/path-sync-account/);

  const html = `<!doctype html>
<html lang="pt-PT">
<head><meta charset="utf-8" /></head>
<body>
${fragment}
<script type="module">
  import { t } from "/i18n.js";
  for (const [id, key] of [
    ["pathScanMachine", "pathScanMachine"],
    ["pathCheckWeb", "pathCheckWeb"]
  ]) {
    const el = document.getElementById(id);
    if (el) el.textContent = t("pt-PT", key);
  }
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
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  try {
    await page.goto(`http://127.0.0.1:${port}/`);
    await expect(page.getByTestId("path-scan-machine")).toHaveText("Analisar este computador");
    await expect(page.getByTestId("path-check-web")).toHaveText("Verificar um site");
    await expect(page.getByTestId("path-sync-account")).toHaveCount(0);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});
