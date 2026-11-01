import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Client components must not import server-only env-local / probe-budget (node:fs). */
test("AppShell and SettingsPanel stay on probe-budget-suggest only", () => {
  const root = join(process.cwd(), "components");
  const files = readdirSync(root).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
  for (const name of files) {
    const text = readFileSync(join(root, name), "utf8");
    assert.equal(
      /from\s+["']\.\.\/security\/env-local["']/.test(text),
      false,
      `${name} must not import security/env-local`
    );
    assert.equal(
      /from\s+["']\.\.\/security\/probe-budget["']/.test(text),
      false,
      `${name} must not import security/probe-budget (use probe-budget-suggest)`
    );
  }
  const appShell = readFileSync(join(root, "AppShell.tsx"), "utf8");
  assert.match(appShell, /probe-budget-suggest/);
});

test("website UrlCheckForm and AppShell never send personalListBlocked", () => {
  const form = readFileSync(join(process.cwd(), "components/UrlCheckForm.tsx"), "utf8");
  const shell = readFileSync(join(process.cwd(), "components/AppShell.tsx"), "utf8");
  assert.match(form, /Never sends personalListBlocked/);
  assert.equal(/personalListBlocked\s*:/.test(form), false);
  assert.match(shell, /JSON\.stringify\(\{\s*url,\s*skipHeadHosts\s*\}\)/);
  assert.equal(/personalListBlocked\s*:\s*true/.test(shell), false);
});