/**
 * Secondary chrome (Downloads / Lists) lives under the stage, not the top nav.
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
  expect(shell).not.toMatch(/data-testid="nav-lists-offline"/);
  expect(shell).toMatch(/data-testid="home-downloads-cta"/);
  expect(shell).toMatch(/data-testid="home-lists-cta"/);
});

test("AppShell renders home-downloads-cta on idle and result (analysis) views", () => {
  const shell = readFileSync("components/AppShell.tsx", "utf8");
  expect(shell).toMatch(/settings#settings-desktop/);
  expect(shell).toMatch(/homeDownloadsCta/);
  const ctaCount = [...shell.matchAll(/data-testid="home-downloads-cta"/g)].length;
  expect(ctaCount).toBeGreaterThanOrEqual(2);
  expect(shell).toMatch(/RiskResult[\s\S]*home-downloads-cta/);
});
