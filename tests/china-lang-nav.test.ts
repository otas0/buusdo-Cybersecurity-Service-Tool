/**
 * Every China Pages HTML surface has 中文 · EN + bilingual pair + site nav.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = path.join(process.cwd(), "china-pages");
const pages = readdirSync(root).filter((f) => f.endsWith(".html"));

const pairs: Array<{ zh: string; en: string }> = [
  { zh: "index.html", en: "en.html" },
  { zh: "install.html", en: "install-en.html" },
  { zh: "privacy.html", en: "privacy-en.html" }
];

test("china-pages lists exactly the bilingual HTML set", () => {
  assert.deepEqual(pages.slice().sort(), [
    "en.html",
    "index.html",
    "install-en.html",
    "install.html",
    "privacy-en.html",
    "privacy.html"
  ]);
});

test("every china-pages HTML has 中文 · EN lang switch", () => {
  for (const file of pages) {
    const html = readFileSync(path.join(root, file), "utf8");
    assert.match(html, /data-testid="china-lang-switch"/, file);
    assert.match(html, />中文</, file);
    assert.match(html, />EN</, file);
    assert.match(html, /class="china-site-nav"/, file);
  }
});

test("china-pages lang switch pairs point at zh/en counterparts", () => {
  for (const { zh, en } of pairs) {
    const zhHtml = readFileSync(path.join(root, zh), "utf8");
    const enHtml = readFileSync(path.join(root, en), "utf8");
    assert.match(zhHtml, new RegExp(`href="\\./${en.replace(".", "\\.")}"`));
    assert.match(enHtml, new RegExp(`href="\\./${zh.replace(".", "\\.")}"`));
    assert.match(zhHtml, /lang="zh-CN"/);
    assert.match(enHtml, /lang="en"/);
  }
});
