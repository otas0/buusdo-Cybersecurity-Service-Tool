/**
 * Settings macOS note — stub /api/desktop-downloads/status → ready-to-promote.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/settings-mac-ready-to-promote.spec.ts
 */
import { createServer } from "node:http";
import { expect, test } from "@playwright/test";

test("Settings shows ready-to-promote when status API says so", async ({ page }) => {
  const html = `<!doctype html>
<html lang="en"><body>
  <p class="hint" data-testid="settings-desktop-download-row">
    <a data-testid="settings-desktop-download-mac" href="#">macOS app (zip)</a>
    <span class="hint" id="macNote" hidden></span>
  </p>
  <script>
    (async () => {
      const note = document.getElementById("macNote");
      try {
        const data = await fetch("/api/desktop-downloads/status").then((r) => r.json());
        if (data.macNote === "ready-to-promote") {
          note.hidden = false;
          note.dataset.testid = "settings-desktop-mac-ready-to-promote";
          note.textContent = "Notarized zip is live (HEAD 200) but Settings still points at the unsigned primary — run desktop-promote-macos-url.";
        } else if (data.macNote === "unsigned-until-promote") {
          note.hidden = false;
          note.dataset.testid = "settings-desktop-mac-unsigned-note";
          note.textContent = "unsigned until promote";
        }
      } catch (e) {
        note.hidden = false;
        note.textContent = String(e);
      }
    })();
  </script>
</body></html>`;

  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname === "/api/desktop-downloads/status") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          macNote: "ready-to-promote",
          notarizedHeadOk: true,
          notarizedHeadStatus: 200,
          notPromoted: true,
          primaryIsNotarized: false
        })
      );
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  try {
    await page.goto(`http://127.0.0.1:${port}/`);
    await expect(page.getByTestId("settings-desktop-mac-ready-to-promote")).toBeVisible();
    await expect(page.getByTestId("settings-desktop-mac-ready-to-promote")).toContainText(
      /desktop-promote-macos-url|HEAD 200/
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});