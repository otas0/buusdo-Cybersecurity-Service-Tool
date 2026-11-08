/**
 * Extension Halt toast DOM fixture (phishing next-steps).
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/extension-toast-phishing.spec.ts
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();
const html = readFileSync(join(root, "extension/content/phishing-toast-fixture.html"), "utf8");
const css = readFileSync(join(root, "extension/content/toast.css"), "utf8");
const mountJs = readFileSync(join(root, "extension/content/phishing-toast-mount.js"), "utf8");

test("phishing toast fixture mounts survey Halt blocks", async ({ page }) => {
  const server = createServer((req, res) => {
    const url = req.url || "/";
    if (url.includes("toast.css")) {
      res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
      res.end(css);
      return;
    }
    if (url.includes("phishing-toast-mount.js")) {
      res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      res.end(mountJs);
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      html
        .replace(/href="\.\/toast\.css"/, 'href="/toast.css"')
        .replace(/src="\.\/phishing-toast-mount\.js"/, 'src="/phishing-toast-mount.js"')
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  try {
    await page.goto(`http://127.0.0.1:${port}/`);
    await expect(page.getByTestId("result-action-row")).toBeVisible();
    await expect(page.getByTestId("result-danger-level")).toContainText(/Danger level/i);
    await expect(page.getByTestId("result-ignore-risk")).toBeVisible();
    await expect(page.getByTestId("result-next-steps")).toBeVisible();
    await expect(page.getByTestId("result-next-steps").locator("li")).toHaveCount(3);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});
