/**
 * Secondary chrome (Downloads / Lists) lives under the stage; CTAs point at /downloads.
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/home-downloads-cta-narrow.spec.ts
 */
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("top nav keeps primary + tools only; home CTAs stay in stage-secondary", () => {
  const css = readFileSync("app/shield.css", "utf8");
  const shell = readFileSync("components/AppShell.tsx", "utf8");
  expect(css).toMatch(/\.top-nav-primary/);
  expect(css).toMatch(/\.top-nav-tools/);
  expect(css).toMatch(/\.stage-secondary/);
  expect(shell).toMatch(/top-nav-primary/);
  expect(shell).toMatch(/top-nav-tools/);
  expect(shell).not.toMatch(/data-testid="nav-downloads"/);
  expect(shell).toMatch(/\/\$\{locale\}\/downloads/);
  expect(shell).toMatch(/homeDownloadsCta/);
  expect(shell).toMatch(/data-testid="home-downloads-cta"/);
});

test("AppShell renders home-downloads-cta on idle and result (analysis) views", () => {
  const shell = readFileSync("components/AppShell.tsx", "utf8");
  const ctaCount = [...shell.matchAll(/data-testid="home-downloads-cta"/g)].length;
  expect(ctaCount).toBeGreaterThanOrEqual(2);
  expect(shell).toMatch(/RiskResult[\s\S]*home-downloads-cta/);
  expect(shell).toMatch(/stage-secondary[\s\S]*home-downloads-cta/);
});

test("DownloadsPanel hosts desktop + extension sections", () => {
  const panel = readFileSync("components/DownloadsPanel.tsx", "utf8");
  expect(panel).toMatch(/data-testid="downloads-page"/);
  expect(panel).toMatch(/data-testid="settings-desktop-downloads"/);
  expect(panel).toMatch(/data-testid="downloads-desktop-install-steps"/);
  expect(panel).toMatch(/data-testid="downloads-extension"/);
  expect(panel).toMatch(/id="downloads-extension"/);
  expect(panel).toMatch(/data-testid="downloads-extension-store-only"/);
  expect(panel).toMatch(/desktopInstallStep1/);
  expect(panel).toMatch(/extensionStoreOnlyNote/);
});

test("AppShell scrolls #downloads-extension when opening downloads", () => {
  const shell = readFileSync("components/AppShell.tsx", "utf8");
  expect(shell).toMatch(/#downloads-extension/);
  expect(shell).toMatch(/scrollIntoView/);
  expect(shell).toMatch(/downloads-extension/);
});
