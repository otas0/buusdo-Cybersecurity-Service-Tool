/**
 * Desktop STRINGS overlays for sv/da/fi/nb (not EN leftovers on Halt chrome).
 *
 *   npx tsx --test tests/desktop-nordic-overlay.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const src = readFileSync("desktop-app/public/js/i18n.js", "utf8");

function extractBag(id: string): Record<string, string> | null {
  const re = new RegExp(`STRINGS\\[${JSON.stringify(id)}\\] = (\\{[\\s\\S]*?\\n\\});`);
  const m = src.match(re);
  if (!m) return null;
  return Function(`"use strict"; return (${m[1]});`)() as Record<string, string>;
}

const enMatch = src.match(/export const STRINGS = \{\s*en:\s*(\{[\s\S]*?\n  \}),\s*\n  "pt-PT":/);
assert.ok(enMatch);
const en = Function(`"use strict"; return (${enMatch![1]});`)() as Record<string, string>;

for (const id of ["sv", "da", "fi", "nb"] as const) {
  test(`desktop ${id} Halt chrome differs from EN`, () => {
    const bag = extractBag(id);
    assert.ok(bag, `missing STRINGS[${id}]`);
    assert.notEqual(bag!.statusDanger, en.statusDanger);
    assert.notEqual(bag!.scan, en.scan);
    assert.ok(bag!.statusDanger?.trim());
  });
}
