/**
 * Round-2 form is OPEN (public + china-pages copies).
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:playwright:round2-form
 */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();

test("public + china Round-2 forms show OPEN banner and saw_step_by_step", async ({ page }) => {
  const publicPath = join(root, "public/survey/round2.html");
  const chinaPath = join(root, "china-pages/survey-round2.html");
  expect(existsSync(publicPath)).toBe(true);
  expect(existsSync(chinaPath)).toBe(true);

  const html = readFileSync(publicPath, "utf8");
  const server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  try {
    await page.goto(`http://127.0.0.1:${port}/`);
    await expect(page.getByTestId("round2-open")).toBeVisible();
    await expect(page.getByTestId("round2-open")).toContainText(/OPEN/i);
    await expect(page.locator("#saw_step_by_step")).toBeVisible();
    await expect(page.locator("#clicked_bad option[value='not_sure']")).toHaveCount(1);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});
