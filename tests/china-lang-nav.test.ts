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
  assert.match(js, /buusdocst-china-lang-nav/);
  assert.match(js, /data-china-lang/);
  assert.match(js, /china_lang/);
  assert.match(js, /install-en\.html/);
  assert.match(js, /privacy-en\.html/);
  assert.match(js, /location\.replace/);
  assert.match(js, /localStorage\.setItem/);
  assert.match(js, /reachability\.js/);
});

test("bilingual pages mark 中文/EN with data-china-lang and locale Workers CTAs", () => {
  for (const file of bilingualPages) {
    const html = readFileSync(path.join(root, file), "utf8");
    assert.match(html, /data-china-lang="zh"/, file);
    assert.match(html, /data-china-lang="en"/, file);
    assert.match(html, /china_lang=zh/, file);
    assert.match(html, /china_lang=en/, file);
    assert.match(html, /foot-note/, file);
    assert.match(html, /alt="buusdo Cybersecurity Service Tool"/, file);
    const isEn = file === "en.html" || file.endsWith("-en.html");
    if (isEn) {
      assert.match(html, /workers\.dev\/en/, file);
      assert.doesNotMatch(html, /workers\.dev\/zh-Hans/, file);
    } else {
      assert.match(html, /workers\.dev\/zh-Hans/, file);
      assert.doesNotMatch(html, /workers\.dev\/en(?:\/|"|'|\s)/, file);
    }
  }
});

test("survey-round2 is not product nav and skips lang-persist", () => {
  const html = readFileSync(path.join(root, "survey-round2.html"), "utf8");
  assert.doesNotMatch(html, /src=["'][^"']*lang-persist\.js["']/);
  assert.doesNotMatch(html, /china-lang-switch/);
  assert.match(html, /data-testid="china-survey-not-product-nav"/);
  assert.match(html, /data-china-product-nav="off"/);
});

test("lang-persist does not rewrite localStorage on unknown HTML (survey)", async () => {
  const js = readFileSync(path.join(root, "lang-persist.js"), "utf8");
  assert.doesNotMatch(js, /survey-round2/);
  assert.match(js, /hasOwnProperty\.call\(PAIRS,\s*file\)/);

  const vm = await import("node:vm");
  const storage: Record<string, string> = { "buusdocst-china-lang": "en" };
  let wrote = false;
  const context = {
    location: {
      pathname: "/buusdocst/survey-round2.html",
      search: "",
      hash: ""
    },
    localStorage: {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => {
        wrote = true;
        storage[k] = v;
      }
    },
    sessionStorage: {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined
    },
    document: {
      readyState: "complete",
      addEventListener: () => undefined,
      querySelectorAll: () => []
    },
    history: { replaceState: () => undefined },
    URLSearchParams,
    Object
  };
  vm.runInNewContext(js, context);
  assert.equal(wrote, false);
  assert.equal(storage["buusdocst-china-lang"], "en");
});

test("entry pages mark logo aria-current; install/privacy logos do not", () => {
  for (const file of ["index.html", "en.html"]) {
    const html = readFileSync(path.join(root, file), "utf8");
    assert.match(html, /brand-lockup[\s\S]*?aria-current="page"/, file);
  }
  for (const file of ["install.html", "install-en.html", "privacy.html", "privacy-en.html"]) {
    const html = readFileSync(path.join(root, file), "utf8");
    const logoBlock = html.match(/brand-lockup[\s\S]*?<\/h1>/)?.[0] || "";
    assert.doesNotMatch(logoBlock, /aria-current="page"/, file);
  }
});

test("zh entry points Workers CTA at zh-Hans and notes possible EN UI", () => {
  const html = readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /workers\.dev\/zh-Hans/);
  assert.match(html, /data-testid="china-workers-locale-hint"/);
  assert.match(html, /china-workers-locale-hint/);
  assert.match(html, /data-testid="china-workers-locale-hint-dismiss"/);
  assert.match(html, /buusdocst-china-hint-dismissed/);
  assert.match(html, /\/zh-Hans/);
});

test("china-pages lang switch pairs point at zh/en counterparts", () => {
  for (const { zh, en } of pairs) {
    const zhHtml = readFileSync(path.join(root, zh), "utf8");
    const enHtml = readFileSync(path.join(root, en), "utf8");
    const enEsc = en.replace(".", "\\.");
    const zhEsc = zh.replace(".", "\\.");
    assert.match(zhHtml, new RegExp(`href="\\./${enEsc}(?:\\?[^"]*)?"`));
    assert.match(enHtml, new RegExp(`href="\\./${zhEsc}(?:\\?[^"]*)?"`));
    assert.match(zhHtml, /lang="zh-CN"/);
    assert.match(enHtml, /lang="en"/);
  }
});
