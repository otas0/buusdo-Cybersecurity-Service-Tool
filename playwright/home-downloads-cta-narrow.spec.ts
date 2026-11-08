/**
 * ≤360px: nav Downloads hidden; home CTA remains reachable.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/home-downloads-cta-narrow.spec.ts
 */
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("narrow CSS hides nav-downloads but keeps home-downloads-cta", () => {
  const css = readFileSync("app/shield.css", "utf8");
  expect(css).toMatch(/@media \(max-width:\s*360px\)/);
  const block = css.match(/@media \(max-width:\s*360px\)\s*\{([\s\S]*?)\n\}/);
  expect(block?.[1] || "").toMatch(/nav-downloads[\s\S]*display:\s*none/);
  expect(block?.[1] || "").toMatch(/home-downloads-cta[\s\S]*display:\s*block/);
});

test("AppShell still renders home-downloads-cta link to settings-desktop", () => {
  const shell = readFileSync("components/AppShell.tsx", "utf8");
  expect(shell).toMatch(/data-testid="home-downloads-cta"/);
  expect(shell).toMatch(/settings#settings-desktop/);
  expect(shell).toMatch(/homeDownloadsCta/);
});
