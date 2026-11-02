/**
 * Dedicated STRICT guard in ci.yml must ::notice the follow-up step name for Actions search.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

test("ci.yml dedicated STRICT guard emits ::notice::Follow-up step name:", () => {
  const yml = readFileSync(path.resolve(".github/workflows/ci.yml"), "utf8");
  const guardIdx = yml.indexOf(
    "# Dedicated rename guard: STRICT_MAC_SOURCE_TITLE must appear as an exact title line."
  );
  assert.ok(guardIdx >= 0, "dedicated rename guard comment missing");
  const slice = yml.slice(guardIdx, guardIdx + 2500);
  assert.match(
    slice,
    /::notice::Follow-up step name: STRICT_MAC_SOURCE_TITLE missing:/
  );
});