/**
 * Website dual wordmark must hide on-light on dark theme with specificity that
 * beats `.shell .brand-logo { display: block }` (otherwise both marks paint).
 *
 *   npx tsx --test tests/website-wordmark-theme-hide.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("shield.css hides on-light wordmark with !important lockup selectors", () => {
  const css = readFileSync("app/shield.css", "utf8");
  assert.match(
    css,
    /\.shell\s+\.brand-lockup\s+img\.brand-logo\.brand-logo-on-light\s*\{[^}]*display:\s*none\s*!important/
  );
  assert.match(
    css,
    /\[data-theme="light"\][^{]*\.brand-logo-on-dark[^{]*\{[^}]*display:\s*none\s*!important/
  );
  assert.match(
    css,
    /\[data-theme="light"\][^{]*\.brand-logo-on-light[^{]*\{[^}]*display:\s*block\s*!important/
  );
});

test("AppShell does not duplicate formal name beside wordmarks", () => {
  const src = readFileSync("components/AppShell.tsx", "utf8");
  assert.match(src, /brand-logo-on-dark/);
  assert.match(src, /brand-logo-on-light/);
  // Avoid a second painted title when .visually-hidden fails to load.
  assert.doesNotMatch(src, /brand-lockup[\s\S]*visually-hidden[\s\S]*<\/h1>/);
});
