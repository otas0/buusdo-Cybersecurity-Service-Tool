/**
 * Desktop STRINGS overlays for Nordic + Europe popup locales.
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

const OVERLAY = ["sv", "da", "fi", "nb", "de", "fr", "es", "it", "nl"] as const;

for (const id of OVERLAY) {
  test(`desktop ${id} Halt chrome differs from EN`, () => {
    const bag = extractBag(id);
    assert.ok(bag, `missing STRINGS[${id}]`);
    // de keeps Latin “Halt”; assert another chrome key instead.
    if (id === "de") {
      assert.notEqual(bag!.scan, en.scan);
      assert.equal(bag!.statusDanger, "Halt");
    } else {
      assert.notEqual(bag!.statusDanger, en.statusDanger);
    }
    assert.notEqual(bag!.scan, en.scan);
    assert.ok(bag!.statusDanger?.trim());
  });

  test(`desktop ${id} honestLimitsKicker ≠ honestLimitsTitle (gate vs product)`, () => {
    const bag = extractBag(id);
    assert.ok(bag, `missing STRINGS[${id}]`);
    assert.ok(bag!.honestLimitsTitle?.trim());
    assert.ok(bag!.honestLimitsKicker?.trim());
    assert.notEqual(
      bag!.honestLimitsKicker,
      bag!.honestLimitsTitle,
      `${id} kicker must not equal gate title`
    );
    assert.notEqual(bag!.honestLimitsTitle, en.honestLimitsTitle);
  });

  test(`desktop ${id} proxyGuide* OS bodies differ from EN (steps keep OS names)`, () => {
    const bag = extractBag(id);
    assert.ok(bag, `missing STRINGS[${id}]`);
    assert.ok(bag!.proxyGuideSummary?.trim());
    assert.notEqual(bag!.proxyGuideSummary, en.proxyGuideSummary);
    assert.ok(bag!.proxyGuideMac?.trim());
    assert.notEqual(bag!.proxyGuideMac, en.proxyGuideMac);
    assert.match(bag!.proxyGuideMac, /macOS/i);
    assert.ok(bag!.proxyGuideWin?.trim());
    assert.notEqual(bag!.proxyGuideWin, en.proxyGuideWin);
    assert.match(bag!.proxyGuideWin, /Windows/i);
    assert.ok(bag!.proxyGuideLinux?.trim());
    assert.notEqual(bag!.proxyGuideLinux, en.proxyGuideLinux);
    assert.match(bag!.proxyGuideLinux, /Linux/i);
  });
}

test("DESKTOP_BAGS includes Nordic + full Europe popup set", () => {
  const m = src.match(/const DESKTOP_BAGS = new Set\(\[([\s\S]*?)\]\)/);
  assert.ok(m, "DESKTOP_BAGS missing");
  const block = m![1];
  for (const id of OVERLAY) {
    assert.match(block, new RegExp(`["']${id}["']`), `DESKTOP_BAGS missing ${id}`);
  }
});
