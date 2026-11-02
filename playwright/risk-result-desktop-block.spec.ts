/**
 * RiskResult Block on desktop — when Escudo :3010 is down, show need-app tip.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/risk-result-desktop-block.spec.ts
 */
import { createServer } from "node:http";
import { expect, test } from "@playwright/test";

const html = `<!doctype html>
<html lang="en">
<body>
  <div class="action-row" data-testid="result-action-row">
    <button type="button" class="text-button" data-testid="add-desktop-block" id="blockBtn">
      Block on desktop (Shield)
    </button>
    <p class="hint" data-testid="desktop-block-need-app" id="needApp" hidden role="status"></p>
  </div>
  <script>
    const btn = document.getElementById("blockBtn");
    const note = document.getElementById("needApp");
    const pt = false;
    const feedbackHost = "evil.example";
    btn.addEventListener("click", async () => {
      note.hidden = true;
      note.textContent = "";
      const deep = "http://127.0.0.1:3010/?blockHost=" + encodeURIComponent(feedbackHost) + "#listsSection";
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 800);
        const res = await fetch("http://127.0.0.1:3010/api/state", {
          method: "GET",
          signal: ctrl.signal,
          mode: "cors"
        }).catch(() => null);
        clearTimeout(timer);
        if (!res || !res.ok) {
          note.textContent = pt
            ? "Abra primeiro o desktop Escudo (localhost:3010), depois tente de novo."
            : "Open the Escudo desktop app first (localhost:3010), then try again.";
          note.hidden = false;
          return;
        }
        window.open(deep, "_blank", "noopener,noreferrer");
      } catch {
        note.textContent = "Open the Escudo desktop app first (localhost:3010), then try again.";
        note.hidden = false;
      }
    });
  </script>
</body>
</html>`;

test("desktop down → desktop-block-need-app copy", async ({ page }) => {
  // Route any probe to :3010 as failed so we do not depend on a live desktop.
  await page.route("http://127.0.0.1:3010/**", (route) => route.abort());

  const server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  try {
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.getByTestId("add-desktop-block").click();
    const tip = page.getByTestId("desktop-block-need-app");
    await expect(tip).toBeVisible();
    await expect(tip).toContainText("Open the Escudo desktop app first");
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});