/**
 * China Pages install Setup guide links match workers.dev Settings (same DESKTOP_SETUP_GUIDE URL).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const repo = path.resolve(".");
const downloads = JSON.parse(
  readFileSync(path.join(repo, "shared/desktop-downloads.json"), "utf8")
) as { setupGuideUrl?: string };
const expected = String(downloads.setupGuideUrl || "").trim();

function assertInstallPage(file: string, labelRe: RegExp, workersLocale: "zh-Hans" | "en") {
  const html = readFileSync(path.join(repo, "china-pages", file), "utf8");
  assert.ok(expected.includes("DESKTOP_SETUP_GUIDE"), "setupGuideUrl must point at DESKTOP_SETUP_GUIDE");
  assert.match(html, /data-testid="china-setup-guide"/);
  assert.match(html, labelRe);
  assert.ok(html.includes(expected), `${file} must include setupGuideUrl ${expected}`);
  assert.match(
    html,
    new RegExp(`buusdocst\\.mtsu\\.workers\\.dev\\/${workersLocale}/settings#settings-desktop`)
  );
}

test("china-pages zh install Setup guide href matches desktop-downloads setupGuideUrl", () => {
  assertInstallPage("install.html", /安装指南（未签名）|Setup guide \(unsigned\)/, "zh-Hans");
});

test("china-pages en install Setup guide href matches desktop-downloads setupGuideUrl", () => {
  assertInstallPage("install-en.html", /Setup guide \(unsigned\)/, "en");
});

test("china-pages EN entry links to English install/privacy (not zh-only)", () => {
  const en = readFileSync(path.join(repo, "china-pages/en.html"), "utf8");
  assert.match(en, /href="\.\/install-en\.html"/);
  assert.match(en, /href="\.\/privacy-en\.html"/);
  assert.match(en, /What the product does/);
});

test("CHINA_GITHUB_PAGES locale table matches install Workers settings hrefs", () => {
  const docs = readFileSync(path.join(repo, "docs/CHINA_GITHUB_PAGES.md"), "utf8");
  assert.match(docs, /\/zh-Hans\/settings#settings-desktop/);
  assert.match(docs, /\/en\/settings#settings-desktop/);
  const zhInstall = readFileSync(path.join(repo, "china-pages/install.html"), "utf8");
  const enInstall = readFileSync(path.join(repo, "china-pages/install-en.html"), "utf8");
  assert.match(zhInstall, /buusdocst\.mtsu\.workers\.dev\/zh-Hans\/settings#settings-desktop/);
  assert.match(enInstall, /buusdocst\.mtsu\.workers\.dev\/en\/settings#settings-desktop/);
});
