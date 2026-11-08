/**
 * Every China Pages HTML surface has 中文 · EN + bilingual pair + site nav.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = path.join(process.cwd(), "china-pages");

const pairs: Array<{ zh: string; en: string }> = [
  { zh: "index.html", en: "en.html" },
  { zh: "install.html", en: "install-en.html" },
  { zh: "privacy.html", en: "privacy-en.html" }
];

const bilingualPages = pairs.flatMap((p) => [p.zh, p.en]);

test("china-pages bilingual product set is present", () => {
  const onDisk = readdirSync(root).filter((f) => f.endsWith(".html"));
  for (const file of bilingualPages) {
    assert.ok(onDisk.includes(file), `missing ${file}`);
  }
});

test("every bilingual china-pages HTML has 中文 · EN lang switch + persist", () => {
  for (const file of bilingualPages) {
    const html = readFileSync(path.join(root, file), "utf8");
    assert.match(html, /data-testid="china-lang-switch"/, file);
    assert.match(html, />中文</, file);
    assert.match(html, />EN</, file);
    assert.match(html, /class="china-site-nav"/, file);
    assert.match(html, /src="\.\/lang-persist\.js"/, file);
  }
});

test("lang-persist maps zh/en page pairs and stores preference key", () => {
  const js = readFileSync(path.join(root, "lang-persist.js"), "utf8");
  assert.match(js, /buusdocst-china-lang/);
  assert.match(js, /install-en\.html/);
  assert.match(js, /privacy-en\.html/);
  assert.match(js, /location\.replace/);
  assert.match(js, /localStorage\.setItem/);
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
