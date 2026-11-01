import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("shared tokens define --halt and extension popup loads tokens.css", () => {
  const tokens = readFileSync(join(process.cwd(), "shared/tokens.css"), "utf8");
  assert.match(tokens, /--halt:\s*#ff4d00/);
  assert.match(tokens, /Safari disabled controls/);
  assert.match(tokens, /ONLY pattern/);
  assert.match(tokens, /outline:\s*1px solid var\(--halt\)/);
  assert.match(tokens, /extension\/popup \+ desktop-app dashboard/);

  const popupHtml = readFileSync(join(process.cwd(), "extension/popup/popup.html"), "utf8");
  assert.match(popupHtml, /shared\/tokens\.css/);
  assert.match(popupHtml, /id="listsSupportBlobBtn"[^>]*class="[^"]*diag-gated/);

  const popupCss = readFileSync(join(process.cwd(), "extension/popup/popup.css"), "utf8");
  assert.match(popupCss, /var\(--halt\)/);
  assert.match(popupCss, /pointer-events:\s*none/);
  assert.match(popupCss, /#listsSupportBlobBtn\[aria-disabled="true"\]/);
  assert.match(popupCss, /button\.diag-gated\[aria-disabled="true"\]/);
  assert.match(popupCss, /button\.text-button\[aria-disabled="true"\]/);
  assert.match(popupCss, /outline:\s*1px solid var\(--halt\)/);
  assert.match(popupCss, /shared\/tokens\.css/);

  const dashCss = readFileSync(join(process.cwd(), "desktop-app/public/css/dashboard.css"), "utf8");
  assert.match(dashCss, /outline:\s*1px solid var\(--halt\)/);
  assert.match(dashCss, /Safari-friendly disabled contrast/);
});