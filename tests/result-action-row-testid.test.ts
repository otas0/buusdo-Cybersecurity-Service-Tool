import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("result-action-row testid mirrored on website, popup, desktop, and toast", () => {
  const risk = readFileSync(join(process.cwd(), "components/RiskResult.tsx"), "utf8");
  assert.match(risk, /data-testid="result-action-row"/);

  const popup = readFileSync(join(process.cwd(), "extension/popup/popup.html"), "utf8");
  assert.match(popup, /data-testid="result-action-row"/);

  const desktop = readFileSync(join(process.cwd(), "desktop-app/public/index.html"), "utf8");
  assert.match(desktop, /data-testid="result-action-row"/);

  const toast = readFileSync(join(process.cwd(), "extension/content/content.js"), "utf8");
  assert.match(toast, /data-testid", "result-action-row"/);
  assert.match(toast, /Keep dismiss\/Leave controls inside this node/);
  assert.match(toast, /function appendToastAction/);
  assert.match(toast, /portugal-cp-shield-toast__label/);
  assert.match(toast, /portugal-cp-shield-toast__action/);
});