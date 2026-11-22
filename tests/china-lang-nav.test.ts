/**
 * China Pages notice: 中文 · EN + lang-persist (index / en only).
 *
 *   npx tsx --test tests/china-lang-nav.test.ts
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = path.join(process.cwd(), "china-pages");

const pairs: Array<{ zh: string; en: string }> = [{ zh: "index.html", en: "en.html" }];
const bilingualPages = pairs.flatMap((p) => [p.zh, p.en]);

test("china-pages notice set is present", () => {
  const onDisk = readdirSync(root).filter((f) => f.endsWith(".html"));
  for (const file of bilingualPages) {
    assert.ok(onDisk.includes(file), `missing ${file}`);
  }
});

test("every notice HTML has 中文 · EN lang switch + persist", () => {
  for (const file of bilingualPages) {
    const html = readFileSync(path.join(root, file), "utf8");
    assert.match(html, /data-testid="china-lang-switch"/, file);
    assert.match(html, />中文</, file);
    assert.match(html, />EN</, file);
    assert.match(html, /src="\.\/lang-persist\.js"/, file);
    assert.match(html, /src="\.\/region-redirect\.js"/, file);
    assert.match(html, /data-testid="china-notice"/, file);
    assert.doesNotMatch(html, /class="china-site-nav"/, file);
  }
});

test("lang-persist maps index/en only", () => {
  const js = readFileSync(path.join(root, "lang-persist.js"), "utf8");
  assert.match(js, /buusdocst-china-lang/);
  assert.match(js, /buusdocst-china-lang-nav/);
  assert.match(js, /data-china-lang/);
  assert.match(js, /china_lang/);
  assert.match(js, /index\.html/);
  assert.match(js, /en\.html/);
  assert.doesNotMatch(js, /install-en\.html/);
  assert.doesNotMatch(js, /privacy-en\.html/);
  assert.match(js, /location\.replace/);
  assert.match(js, /localStorage\.setItem/);
  assert.match(js, /china_stay/);
  assert.match(js, /buusdocst-china-stay-session/);
  assert.match(js, /withStay/);
});

test("notice pages mark 中文/EN and Workers entry CTAs", () => {
  for (const file of bilingualPages) {
    const html = readFileSync(path.join(root, file), "utf8");
    assert.match(html, /data-china-lang="zh"/, file);
    assert.match(html, /data-china-lang="en"/, file);
    assert.match(html, /china_lang=zh/, file);
    assert.match(html, /china_lang=en/, file);
    assert.match(html, /foot-note/, file);
    assert.match(html, /alt="buusdo Cybersecurity Service Tool"/, file);
    assert.match(html, /data-testid="china-workers-entry"/, file);
    const isEn = file === "en.html";
    if (isEn) {
      assert.match(html, /workers\.dev\/en/);
      assert.match(html, /data-testid="china-workers-zh-hans"/);
      assert.match(html, /workers\.dev\/zh-Hans/);
    } else {
      assert.match(html, /workers\.dev\/zh-Hans/);
    }
  }
});

test("lang-persist does not rewrite localStorage on unknown HTML", async () => {
  const js = readFileSync(path.join(root, "lang-persist.js"), "utf8");
  assert.match(js, /hasOwnProperty\.call\(PAIRS,\s*file\)/);

  const vm = await import("node:vm");
  const storage: Record<string, string> = { "buusdocst-china-lang": "en" };
  let wrote = false;
  const context = {
    location: {
      pathname: "/buusdocst/not-a-product-page.html",
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

test("notice logos mark aria-current", () => {
  for (const file of ["index.html", "en.html"]) {
    const html = readFileSync(path.join(root, file), "utf8");
    assert.match(html, /brand-lockup[\s\S]*?aria-current="page"/, file);
  }
});

test("legacy install/privacy are thin redirects to notice", () => {
  for (const file of ["install.html", "privacy.html"]) {
    const html = readFileSync(path.join(root, file), "utf8");
    assert.match(html, /location\.replace\("\.\/index\.html"/, file);
    assert.doesNotMatch(html, /region-redirect\.js/, file);
  }
  for (const file of ["install-en.html", "privacy-en.html"]) {
    const html = readFileSync(path.join(root, file), "utf8");
    assert.match(html, /location\.replace\("\.\/en\.html"/, file);
  }
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
