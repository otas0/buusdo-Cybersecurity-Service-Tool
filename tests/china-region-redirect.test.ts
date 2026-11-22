/**
 * China notice auto-guides to Workers when health succeeds (all notice pages).
 *
 *   npx tsx --test tests/china-region-redirect.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const scriptPath = "china-pages/region-redirect.js";

test("region-redirect.js ships opt-out, health probe, and Workers locale paths", () => {
  assert.ok(existsSync(scriptPath));
  const src = readFileSync(scriptPath, "utf8");
  assert.match(src, /buusdocst-china-stay/);
  assert.match(src, /china_stay/);
  assert.match(src, /\/api\/health/);
  assert.match(src, /location\.replace/);
  assert.match(src, /\/zh-Hans/);
  assert.match(src, /\/zh-Hant/);
  assert.match(src, /\/en/);
  assert.match(src, /EXPECTED_SERVICE|buusdocst/);
  assert.match(src, /preflight|OPTIONS\/CORS/);
  assert.doesNotMatch(src, /Only entry pages/);
  assert.doesNotMatch(src, /ENTRY\s*=/);
});

test("index.html and en.html load region-redirect and expose stay link", () => {
  for (const file of ["china-pages/index.html", "china-pages/en.html"]) {
    const html = readFileSync(file, "utf8");
    assert.match(html, /<script src="\.\/region-redirect\.js"><\/script>/, file);
    assert.doesNotMatch(html, /region-redirect\.js" defer/, file);
    assert.match(html, /data-testid="china-region-redirect-hint"/, file);
    assert.match(html, /data-testid="china-stay-link"/, file);
    assert.match(html, /data-testid="china-stay-clear"/, file);
    assert.match(html, /china_stay=1/, file);
    assert.match(html, /china_stay=0/, file);
    assert.match(html, /data-testid="china-notice-title"/, file);
  }
});

test("legacy stubs redirect to notice without region-redirect", () => {
  for (const file of [
    "china-pages/install.html",
    "china-pages/install-en.html",
    "china-pages/privacy.html",
    "china-pages/privacy-en.html"
  ]) {
    const html = readFileSync(file, "utf8");
    assert.doesNotMatch(html, /region-redirect\.js/, file);
    assert.match(html, /location\.replace/, file);
  }
});

function makeReachEl() {
  const status = { textContent: "Checking…" };
  const detail = { textContent: "" };
  return {
    dataset: { state: "checking" } as { state: string },
    querySelector(sel: string) {
      if (sel === "[data-reach-status]") return status;
      if (sel === "[data-reach-detail]") return detail;
      return null;
    },
    _status: status,
    _detail: detail
  };
}

function runRedirect(opts: {
  pathname: string;
  search?: string;
  languages?: string[];
  lang?: string;
  health?: { ok: boolean; service: string } | null;
  withReach?: boolean;
}) {
  const js = readFileSync(scriptPath, "utf8");
  const storage: Record<string, string> = {};
  const session: Record<string, string> = {};
  const state = { replaced: "" };
  const reach = opts.withReach ? makeReachEl() : null;
  const context: Record<string, unknown> = {
    location: {
      pathname: opts.pathname,
      search: opts.search ?? "",
      replace(url: string) {
        state.replaced = url;
      }
    },
    localStorage: {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => {
        storage[k] = v;
      },
      removeItem: (k: string) => {
        delete storage[k];
      }
    },
    sessionStorage: {
      getItem: (k: string) => session[k] ?? null,
      setItem: (k: string, v: string) => {
        session[k] = v;
      },
      removeItem: (k: string) => {
        delete session[k];
      }
    },
    navigator: {
      languages: opts.languages ?? ["zh-CN"],
      language: (opts.languages && opts.languages[0]) || "zh-CN"
    },
    document: {
      readyState: "complete",
      documentElement: { lang: opts.lang ?? "zh-CN" },
      getElementById: (id: string) => (id === "workers-reach" ? reach : null),
      addEventListener() {
        /* no-op when readyState is complete */
      }
    },
    AbortController,
    Promise,
    setTimeout,
    clearTimeout,
    URLSearchParams,
    fetch(url: string, init?: { signal?: AbortSignal }) {
      void url;
      void init;
      if (!opts.health) {
        return Promise.reject(new Error("network"));
      }
      const body = opts.health;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(body)
      });
    }
  };
  vm.createContext(context);
  vm.runInContext(js, context);
  return {
    get replaced() {
      return state.replaced;
    },
    storage,
    reach,
    flush: () =>
      new Promise<void>((resolve) => {
        setImmediate(() => setImmediate(() => resolve()));
      })
  };
}

test("vm: health ok redirects index to Workers zh-Hans", async () => {
  const run = runRedirect({
    pathname: "/buusdocst/index.html",
    languages: ["zh-CN"],
    health: { ok: true, service: "buusdocst" }
  });
  await run.flush();
  assert.match(run.replaced, /^https:\/\/buusdocst\.mtsu\.workers\.dev\/zh-Hans$/);
});

test("vm: zh-TW browser language opens /zh-Hant", async () => {
  const run = runRedirect({
    pathname: "/buusdocst/index.html",
    languages: ["zh-TW"],
    health: { ok: true, service: "buusdocst" }
  });
  await run.flush();
  assert.match(run.replaced, /\/zh-Hant$/);
});

test("vm: china_stay=1 skips redirect (session only; clears sticky localStorage)", async () => {
  const run = runRedirect({
    pathname: "/buusdocst/index.html",
    search: "?china_stay=1",
    health: { ok: true, service: "buusdocst" },
    withReach: true
  });
  await run.flush();
  assert.equal(run.replaced, "");
  assert.equal(run.storage["buusdocst-china-stay"], undefined);
  assert.equal(run.reach?.dataset.state, "stay");
  assert.notEqual(run.reach?.dataset.state, "checking");
  assert.match(run.reach?._status.textContent || "", /留在本告知书|Staying on notice/);
});

test("vm: legacy localStorage stay is cleared and force-redirects", async () => {
  const js = readFileSync(scriptPath, "utf8");
  const storage: Record<string, string> = { "buusdocst-china-stay": "1" };
  const session: Record<string, string> = {};
  const state = { replaced: "" };
  const context: Record<string, unknown> = {
    location: {
      pathname: "/buusdocst/index.html",
      search: "",
      replace(url: string) {
        state.replaced = url;
      }
    },
    localStorage: {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => {
        storage[k] = v;
      },
      removeItem: (k: string) => {
        delete storage[k];
      }
    },
    sessionStorage: {
      getItem: (k: string) => session[k] ?? null,
      setItem: (k: string, v: string) => {
        session[k] = v;
      },
      removeItem: (k: string) => {
        delete session[k];
      }
    },
    navigator: { languages: ["zh-CN"], language: "zh-CN" },
    document: {
      documentElement: { lang: "zh-CN" },
      getElementById: () => null
    },
    AbortController,
    Promise,
    setTimeout,
    clearTimeout,
    URLSearchParams,
    fetch() {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true, service: "buusdocst" })
      });
    }
  };
  vm.createContext(context);
  vm.runInContext(js, context);
  await new Promise<void>((r) => setImmediate(() => setImmediate(() => r())));
  assert.equal(storage["buusdocst-china-stay"], undefined);
  assert.match(state.replaced, /\/zh-Hans$/);
});

test("vm: health fail leaves notice in place", async () => {
  const run = runRedirect({
    pathname: "/buusdocst/index.html",
    health: null
  });
  await run.flush();
  assert.equal(run.replaced, "");
});
