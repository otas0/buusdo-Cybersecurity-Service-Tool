/**
 * de / fr / es proxyGuideMac|Win|Linux must stay native (not EN snapshot bodies).
 *
 *   npx tsx --test tests/pack-proxy-guide-de-fr-es.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const en = JSON.parse(readFileSync("i18n/packs/_en.snapshot.json", "utf8")) as Record<
  string,
  string
>;
const KEYS = ["proxyGuideMac", "proxyGuideWin", "proxyGuideLinux"] as const;

for (const id of ["de", "fr", "es"] as const) {
  test(`${id} proxyGuide OS bodies ≠ EN snapshot`, () => {
    const pack = JSON.parse(readFileSync(`i18n/packs/${id}.json`, "utf8")) as Record<
      string,
      string
    >;
    for (const key of KEYS) {
      assert.ok(pack[key]?.trim(), `${id}.${key} missing`);
      assert.notEqual(pack[key], en[key], `${id}.${key} must not equal EN`);
    }
    assert.match(pack.proxyGuideMac, /macOS/i);
    assert.match(pack.proxyGuideWin, /Windows/i);
    assert.match(pack.proxyGuideLinux, /Linux/i);
  });
}
