/**
 * xh / st China notice strings stay in shared i18n (popup no longer paints API China chrome).
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/extension-popup-xh-st-china-links.spec.ts
 */
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("xh/st China notice keys remain in extension shared i18n", async () => {
  const src = readFileSync("extension/shared/i18n.js", "utf8");
  expect(src).toContain("Vula isaziso");
  expect(src).toContain("Susa ukuhlala");
  expect(src).toContain("Bula tsebiso");
  expect(src).toContain("Hlakola ho dula");

  const html = readFileSync("extension/popup/popup.html", "utf8");
  expect(html).not.toMatch(/id="langSelect"/);
  expect(html).toMatch(/id="manageListsLink"/);
});
