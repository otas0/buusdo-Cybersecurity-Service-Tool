/**
 * Desktop auto-sync toast — mock /api/account/sync → data-testid=account-auto-sync-toast.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/desktop-account-auto-sync-toast.spec.ts
 */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const root = path.resolve(".");
const cssPath = path.join(root, "desktop-app/public/css/dashboard.css");
const tokensPath = path.join(root, "shared/tokens.css");

test("mock sync shows account-auto-sync-toast", async ({ page }) => {
  if (!existsSync(cssPath) || !existsSync(tokensPath)) {
    test.skip(true, "dashboard css/tokens missing");
    return;
  }

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="/tokens.css" />
  <link rel="stylesheet" href="/dashboard.css" />
</head>
<body style="background:#0e0e0e;color:#f3f1ea">
  <div id="toastHost" class="toast-host" aria-live="polite"></div>
  <p id="accountStatus" class="hint" role="status" aria-live="polite"></p>
  <button type="button" id="runAutoSync">Auto sync</button>
  <script>
    const toastHost = document.getElementById("toastHost");
    const accountStatus = document.getElementById("accountStatus");
    function showMessageToast(message, kind, opts) {
      const el = document.createElement("div");
      el.className = "toast " + (kind === "danger" ? "toast-danger" : "toast-caution");
      el.textContent = message;
      if (opts && opts.testId) el.dataset.testid = opts.testId;
      toastHost.appendChild(el);
      requestAnimationFrame(() => el.classList.add("is-visible"));
    }
    function setAccountStatusQuiet(msg) {
      accountStatus.setAttribute("aria-live", "off");
      accountStatus.textContent = msg || "";
    }
    document.getElementById("runAutoSync").addEventListener("click", async () => {
      const res = await fetch("/api/account/sync", { method: "POST" }).then((r) => r.json());
      const msg = res.ok ? "Lists auto-synced after sign-in." : ("Auto-sync failed: " + (res.error || "fail"));
      setAccountStatusQuiet(msg);
      showMessageToast(msg, res.ok ? "caution" : "danger", { testId: "account-auto-sync-toast" });
    });
  </script>
</body>
</html>`;

  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname === "/api/account/sync" && req.method === "POST") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, merged: false }));
      return;
    }
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
    await page.locator("#runAutoSync").click();
    await expect(page.getByTestId("account-auto-sync-toast")).toBeVisible();
    await expect(page.getByTestId("account-auto-sync-toast")).toContainText(/auto-synced|Lists/i);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});