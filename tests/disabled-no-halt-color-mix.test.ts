import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

/** Disabled / aria-disabled blocks must not use color-mix with --halt (Safari contrast). */
function disabledBlocksWithHaltMix(css: string): string[] {
  const hits: string[] = [];
  const re =
    /(?:^|\n)([^{}]*?(?:\[aria-disabled|:disabled)[^{]*)\{([^}]*)\}/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const body = m[2];
    if (/color-mix/i.test(body) && /--halt|halt/i.test(body)) {
      hits.push(m[1].trim());
    }
  }
  return hits;
}

test("popup + dashboard disabled styles reject color-mix with Halt", () => {
  const popup = readFileSync(join(process.cwd(), "extension/popup/popup.css"), "utf8");
  const dash = readFileSync(join(process.cwd(), "desktop-app/public/css/dashboard.css"), "utf8");
  assert.deepEqual(disabledBlocksWithHaltMix(popup), []);
  assert.deepEqual(disabledBlocksWithHaltMix(dash), []);
  assert.match(popup, /outline:\s*1px solid var\(--halt\)/);
  assert.match(dash, /outline:\s*1px solid var\(--halt\)/);
});

test("toast Halt danger uses solid field without color-mix", () => {
  const toast = readFileSync(join(process.cwd(), "extension/content/toast.css"), "utf8");
  assert.match(toast, /\.portugal-cp-shield-toast__label/);
  assert.match(toast, /\.portugal-cp-shield-toast__action/);
  assert.match(toast, /\.portugal-cp-shield-toast--danger/);
  assert.equal(/toast--danger[^{]*\{[^}]*color-mix/i.test(toast), false);
});