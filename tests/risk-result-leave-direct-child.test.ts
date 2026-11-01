import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("RiskResult Leave button is a direct child of result-action-row", () => {
  const src = readFileSync(join(process.cwd(), "components/RiskResult.tsx"), "utf8");
  assert.match(
    src,
    /data-testid="result-action-row">\s*<button[\s\S]*?\{t\.leave\}/
  );
  assert.match(src, /Leave must stay a direct child of result-action-row/);
});

test("RiskResult Leave aria-describedby includes ambiguous-probe-not-phishing when chip on", () => {
  const src = readFileSync(join(process.cwd(), "components/RiskResult.tsx"), "utf8");
  assert.match(src, /id="ambiguous-probe-not-phishing"/);
  assert.match(src, /ids\.push\("ambiguous-probe-not-phishing"\)/);
  assert.match(src, /"aria-describedby":\s*ids\.join/);
});