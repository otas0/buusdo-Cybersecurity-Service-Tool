/**
 * formatMinSupportedFloorNote — basename vs desktop-downloads.json source.
 *
 *   node --experimental-strip-types --test tests/min-supported-floor.test.ts
 *   npx tsx --test tests/min-supported-floor.test.ts
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMinSupportedFloorNote } from "../security/min-supported-floor.ts";

test("formatMinSupportedFloorNote keeps desktop-downloads.json source literal", () => {
  const out = formatMinSupportedFloorNote("Minimum supported: {min} · source {source}", {
    min: "0.2.0",
    source: "desktop-downloads.json"
  });
  assert.equal(out, "Minimum supported: 0.2.0 · source desktop-downloads.json");
});

test("formatMinSupportedFloorNote uses basename for packed path sources", () => {
  const out = formatMinSupportedFloorNote("Minimum supported: {min} · source {source}", {
    min: "0.2.0",
    source: "/Applications/Buusdo.app/Contents/Resources/MIN_SUPPORTED.txt"
  });
  assert.equal(out, "Minimum supported: 0.2.0 · source MIN_SUPPORTED.txt");
});

test("formatMinSupportedFloorNote defaults source when omitted", () => {
  const out = formatMinSupportedFloorNote("Floor {min} ({source})", { min: "1.0.0" });
  assert.equal(out, "Floor 1.0.0 (desktop-downloads.json)");
});

test("formatMinSupportedFloorNote handles Windows-style paths", () => {
  const out = formatMinSupportedFloorNote("{min}|{source}", {
    min: "0.3.0",
    source: "C:\\Program Files\\Buusdo\\Resources\\MIN_SUPPORTED.txt"
  });
  assert.equal(out, "0.3.0|MIN_SUPPORTED.txt");
});
