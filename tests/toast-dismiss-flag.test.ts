import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("toast dismiss is behind shieldToastDismiss / payload.dismiss and uses appendToastAction", () => {
  const js = readFileSync(join(process.cwd(), "extension/content/content.js"), "utf8");
  assert.match(js, /TOAST_DISMISS_DEFAULT\s*=\s*false/);
  assert.match(js, /function appendToastAction/);
  assert.match(js, /function resolveToastDismissFlag/);
  assert.match(js, /appendToastAction\(el,\s*btn\)/);
  assert.match(js, /Trust boolean `dismiss` from the service worker only/);
  // No content-script storage read for dismiss (SW is the sender).
  assert.equal(/storage\.local\.get\(\s*TOAST_DISMISS|storage\.local\.get\(\s*"shieldToastDismiss"/.test(js), false);
  assert.match(js, /portugal-cp-shield-toast__action/);
  assert.match(js, /dismiss:\s*"Dismiss"/);
  assert.match(js, /dismiss:\s*"Fechar"/);

  const css = readFileSync(join(process.cwd(), "extension/content/toast.css"), "utf8");
  assert.match(css, /\.portugal-cp-shield-toast__action/);
  assert.match(css, /\.portugal-cp-shield-toast__label/);
  assert.match(css, /background:\s*#ff4d00/);
  assert.match(css, /color:\s*#0e0e0e/);
  assert.match(css, /\.portugal-cp-shield-toast--danger \.portugal-cp-shield-toast__action/);
  assert.equal(/color-mix\s*\(/i.test(css), false);

  const sw = readFileSync(join(process.cwd(), "extension/background/service-worker.js"), "utf8");
  assert.match(sw, /isToastDismissEnabled/);
  assert.match(sw, /const dismiss = await isToastDismissEnabled/);
  assert.match(sw, /\.\.\.payload,\s*dismiss/);

  const popupHtml = readFileSync(join(process.cwd(), "extension/popup/popup.html"), "utf8");
  assert.match(popupHtml, /id="toastDismissToggle"/);
  assert.match(popupHtml, /id="toastDismissStatus"[^>]*role="status"/);
  assert.match(popupHtml, /aria-live="polite"/);
  const popupJs = readFileSync(join(process.cwd(), "extension/popup/popup.js"), "utf8");
  assert.match(popupJs, /TOAST_DISMISS_STORAGE_KEY\s*=\s*"shieldToastDismiss"/);
  assert.match(popupJs, /function announceToastDismiss/);
  assert.match(popupJs, /toastDismissOn|toastDismissOff/);

  const i18n = readFileSync(join(process.cwd(), "extension/shared/i18n.js"), "utf8");
  assert.match(i18n, /toastDismissLabel/);
  assert.match(i18n, /toastDismissOn:/);
  assert.match(i18n, /toastDismissOff:/);

  const readme = readFileSync(join(process.cwd(), "extension/README.md"), "utf8");
  assert.match(readme, /shieldToastDismiss/);
  assert.match(readme, /Toast dismiss button/);
});