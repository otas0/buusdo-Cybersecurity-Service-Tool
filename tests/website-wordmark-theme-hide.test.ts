/**
 * Website dual wordmark must hide on-light on dark theme with specificity that
 * beats `.shell .brand-logo { display: block }` and Tailwind preflight `img`.
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

test("layout imports shield.css after globals (Tailwind preflight) so lockup !important wins", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");
  const globals = readFileSync("app/globals.css", "utf8");
  assert.match(globals, /@import\s+["']tailwindcss["']/);
  const g = layout.indexOf("globals.css");
  const s = layout.indexOf("shield.css");
  assert.ok(g >= 0 && s > g, "shield.css must import after globals.css");
});

test("shield.css primary-button uses Halt fill (not blue UA / cream)", () => {
  const css = readFileSync("app/shield.css", "utf8");
  assert.match(
    css,
    /\.shell\s+\.primary-button\s*\{[^}]*background:\s*var\(--halt\)/
  );
  const tokens = readFileSync("shared/tokens.css", "utf8");
  assert.match(tokens, /--halt:\s*#ff4d00/);
});

test("china-pages dual wordmark hide rules match website lockup selectors", () => {
  const css = readFileSync("china-pages/styles.css", "utf8");
  assert.match(
    css,
    /\.shell\s+\.brand-lockup\s+img\.brand-logo\.brand-logo-on-light\s*\{[^}]*display:\s*none\s*!important/
  );
  assert.match(
    css,
    /\[data-theme="light"\][^{]*\.brand-logo-on-dark[^{]*\{[^}]*display:\s*none\s*!important/
  );
  for (const file of ["china-pages/index.html", "china-pages/en.html"]) {
    const html = readFileSync(file, "utf8");
    assert.match(html, /brand-logo-on-dark/);
    assert.match(html, /brand-logo-on-light/);
    assert.match(html, /buusdo-wordmark-on-light\.svg/);
  }
});

test("AppShell uses vector wordmarks (not PNG) for smooth scale", () => {
  const src = readFileSync("components/AppShell.tsx", "utf8");
  assert.match(src, /buusdo-wordmark\.svg/);
  assert.match(src, /buusdo-wordmark-on-light\.svg/);
  assert.doesNotMatch(src, /buusdo-wordmark\.png/);
});

test("popup + desktop use the same brand-lockup img hide selectors", () => {
  const popup = readFileSync("extension/popup/popup.css", "utf8");
  const dash = readFileSync("desktop-app/public/css/dashboard.css", "utf8");
  for (const css of [popup, dash]) {
    assert.match(
      css,
      /\.brand-lockup\s+img\.brand-logo\.brand-logo-on-light\s*\{[^}]*display:\s*none\s*!important/
    );
    assert.match(
      css,
      /\[data-theme="light"\][^{]*\.brand-logo-on-dark[^{]*\{[^}]*display:\s*none\s*!important/
    );
  }
});

test("ThemeSwitch syncs aria-hidden on wordmarks and clears corrupt theme storage", () => {
  const src = readFileSync("components/ThemeSwitch.tsx", "utf8");
  assert.match(src, /syncWordmarkA11y/);
  assert.match(src, /aria-hidden/);
  assert.match(src, /localStorage\.removeItem\(STORAGE_KEY\)/);
  const layout = readFileSync("app/layout.tsx", "utf8");
  assert.match(layout, /removeItem\(k\)/);
  assert.match(layout, /dataset\.theme='dark'/);
});

test("layout inlines critical CSS so CSS 404 cannot show dual logos or UA-blue Run", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");
  assert.match(layout, /CRITICAL_CSS/);
  assert.match(layout, /brand-logo-on-light\{display:none!important\}/);
  assert.match(layout, /primary-button\{background:#ff4d00/);
  assert.match(layout, /visually-hidden\{/);
});

test("deploy wrap never sets boolean run_worker_first true (404s /_next/static)", async () => {
  const { isValidRunWorkerFirst, RUN_WORKER_FIRST } = await import(
    "../scripts/run-worker-first.mjs"
  );
  assert.equal(isValidRunWorkerFirst(true), false);
  assert.ok(isValidRunWorkerFirst(RUN_WORKER_FIRST));
  const wrap = readFileSync("scripts/wrap-worker-china-cf-redirect.mjs", "utf8");
  assert.doesNotMatch(wrap, /run_worker_first:\s*true/);
});
