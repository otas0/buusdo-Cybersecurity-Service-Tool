/**
 * China Pages install.html Setup guide link matches workers.dev Settings (same DESKTOP_SETUP_GUIDE URL).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const repo = path.resolve(".");
const installHtml = readFileSync(path.join(repo, "china-pages/install.html"), "utf8");
const downloads = JSON.parse(
  readFileSync(path.join(repo, "shared/desktop-downloads.json"), "utf8")
) as { setupGuideUrl?: string };

test("china-pages install Setup guide href matches desktop-downloads setupGuideUrl", () => {
  const expected = String(downloads.setupGuideUrl || "").trim();
  assert.ok(expected.includes("DESKTOP_SETUP_GUIDE"), "setupGuideUrl must point at DESKTOP_SETUP_GUIDE");
  assert.match(installHtml, /data-testid="china-setup-guide"/);
  assert.match(installHtml, /Setup guide \(unsigned\)/);
  assert.ok(
    installHtml.includes(expected),
    `install.html must include setupGuideUrl ${expected}`
  );
  assert.match(installHtml, /buusdocst\.mtsu\.workers\.dev\/en\/settings#settings-desktop/);
});
