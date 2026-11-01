import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("assessRisk personal-hint LEAVE rule links to unit matrix via @see", () => {
  const src = readFileSync(join(process.cwd(), "security/risk.ts"), "utf8");
  assert.match(src, /@see tests\/assess-risk-personal-hint\.test\.ts/);
  assert.match(src, /personalListBlocked && level === "LOW_EVIDENCE"/);
});