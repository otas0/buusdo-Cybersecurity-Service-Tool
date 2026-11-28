/**
 * Settings block-lists — stub BUUSDO_EXT_LISTS_RESULT so read-only extension lists paint.
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test playwright/settings-extension-lists-bridge.spec.ts
 */
import { expect, test } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

test("Settings paints extension lists from BUUSDO_EXT_LISTS_RESULT stub", async ({ page }) => {
  await page.addInitScript(() => {
    window.addEventListener("message", (ev) => {
      const data = ev.data;
      if (!data || data.source === "buusdo-ext") return;
      if (data.type === "BUUSDO_EXT_LISTS_GET") {
        window.postMessage(
          {
            source: "buusdo-ext",
            type: "BUUSDO_EXT_LISTS_RESULT",
            requestId: data.requestId,
            ok: true,
            lists: {
              schema: "shield-lists-v1",
              updatedAt: new Date().toISOString(),
              blocked: [{ domain: "evil.example", reason: "stub", createdAt: new Date().toISOString() }],
              trusted: [{ domain: "bank.example", createdAt: new Date().toISOString() }]
            }
          },
          window.location.origin
        );
      }
    });
    window.postMessage({ source: "buusdo-ext", type: "BUUSDO_EXT_PRESENT", extensionId: "stub-ext-id" }, window.location.origin);
  });

  await page.goto(`${base}/en/settings#settings-block-lists`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="settings-extension-lists-readonly"]', { timeout: 15000 });
  await expect(page.getByTestId("settings-ext-blocked")).toContainText("evil.example");
  await expect(page.getByTestId("settings-ext-trusted")).toContainText("bank.example");
  const href = await page.getByTestId("settings-ext-blocked-evil.example").getAttribute("href");
  expect(href || "").toMatch(/\/en\/lists-offline\?blocked=evil\.example/);
});
