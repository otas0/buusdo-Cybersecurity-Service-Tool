import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("evaluation scenarios never inject personalListBlocked (unit tests own that matrix)", () => {
  const scenarios = readFileSync(join(process.cwd(), "evaluation/scenarios.ts"), "utf8");
  assert.equal(/personalListBlocked/.test(scenarios), false);
  const runner = readFileSync(join(process.cwd(), "evaluation/evaluation-runner.ts"), "utf8");
  assert.match(runner, /user-block/);
  assert.match(runner, /analyse-personal-list-hint/);
});