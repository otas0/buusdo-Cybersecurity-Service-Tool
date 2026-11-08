/**
 * desktop ja-extra website* keys survive sync MAP (not overwritten by pack MAP).
 *
 *   npx tsx --test tests/desktop-ja-extra-website.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { execSync } from "node:child_process";

test("i18n-ja-extra.json is website* only", () => {
  const extra = JSON.parse(
    readFileSync(path.join("desktop-app/public/js/i18n-ja-extra.json"), "utf8")
  ) as Record<string, string>;
  assert.ok(Object.keys(extra).length >= 5);
  for (const key of Object.keys(extra)) {
    assert.match(key, /^website/, `non-website key in ja-extra: ${key}`);
  }
});

test("sync:desktop-i18n:check keeps ja website* from ja-extra", () => {
  execSync("npm run sync:desktop-i18n:check", { stdio: "pipe" });
  const src = readFileSync(path.join("desktop-app/public/js/i18n.js"), "utf8");
  const m = src.match(/STRINGS\["ja"\] = (\{[\s\S]*?\n\});/);
  assert.ok(m, "ja bag missing");
  const ja = Function(`"use strict"; return (${m![1]});`)() as Record<string, string>;
  const extra = JSON.parse(
    readFileSync(path.join("desktop-app/public/js/i18n-ja-extra.json"), "utf8")
  ) as Record<string, string>;
  for (const [k, v] of Object.entries(extra)) {
    assert.equal(ja[k], v, `ja.${k} drifted from ja-extra after sync`);
  }
});
