/**
 * Fail if removed language-panel keys reappear in packs / snapshots.
 *
 *   npx tsx --test tests/pack-no-dead-lang-panel-keys.test.ts
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const DEAD = ["langPanelFrequent", "langPanelAllRegions"] as const;
const packsDir = join(process.cwd(), "i18n/packs");

test("packs and snapshots never reintroduce langPanelFrequent / langPanelAllRegions", () => {
  const files = readdirSync(packsDir).filter((f) => f.endsWith(".json"));
  assert.ok(files.length >= 49, `expected ≥49 pack files, got ${files.length}`);
  for (const file of files) {
    const bag = JSON.parse(readFileSync(join(packsDir, file), "utf8")) as Record<string, string>;
    for (const key of DEAD) {
      assert.equal(key in bag, false, `${file} must not contain ${key}`);
    }
  }
});
