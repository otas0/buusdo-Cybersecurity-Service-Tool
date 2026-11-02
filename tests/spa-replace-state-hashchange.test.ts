import assert from "node:assert/strict";
import { test } from "node:test";
import { replaceStateMaybeHashchange } from "../shared/spa-replace-state";

function mockWin(initialPath: string, initialHash: string, initialSearch = "") {
  let pathname = initialPath;
  let search = initialSearch;
  let hash = initialHash;
  const events: string[] = [];
  const history = {
    replaceState(_s: unknown, _t: string, url: string) {
      const u = new URL(url, "https://example.test");
      pathname = u.pathname;
      search = u.search;
      hash = u.hash;
    }
  };
  const location = {
    get pathname() {
      return pathname;
    },
    get search() {
      return search;
    },
    get hash() {
      return hash;
    }
  };
  return {
    history,
    location,
    dispatchEvent(ev: Event) {
      events.push(ev.type);
      return true;
    },
    events
  };
}

test("synthetic hashchange when pathname stays and only hash flips via replaceState", () => {
  const win = mockWin("/en/settings", "#settings-privacy");
  const fired = replaceStateMaybeHashchange("/en/settings#settings-desktop", win as never);
  assert.equal(fired, true);
  assert.deepEqual(win.events, ["hashchange"]);
  assert.equal(win.location.hash, "#settings-desktop");
});

test("synthetic hashchange when search stays empty and hash flips from \"\" → \"#…\"", () => {
  const win = mockWin("/en/settings", "");
  assert.equal(win.location.search, "");
  assert.equal(win.location.hash, "");
  const fired = replaceStateMaybeHashchange("/en/settings#settings-desktop", win as never);
  assert.equal(fired, true);
  assert.deepEqual(win.events, ["hashchange"]);
  assert.equal(win.location.hash, "#settings-desktop");
  assert.equal(win.location.search, "");
});

test("synthetic hashchange when search is non-empty but unchanged (?x=1 + hash flip)", () => {
  const win = mockWin("/en/settings", "#settings-privacy", "?x=1");
  assert.equal(win.location.search, "?x=1");
  const fired = replaceStateMaybeHashchange(
    "/en/settings?x=1#settings-desktop",
    win as never
  );
  assert.equal(fired, true);
  assert.deepEqual(win.events, ["hashchange"]);
  assert.equal(win.location.hash, "#settings-desktop");
  assert.equal(win.location.search, "?x=1");
});

test("no synthetic hashchange when search changes (?x=1 → ?x=2) with same hash", () => {
  const win = mockWin("/en/settings", "#settings-desktop", "?x=1");
  const fired = replaceStateMaybeHashchange(
    "/en/settings?x=2#settings-desktop",
    win as never
  );
  assert.equal(fired, false);
  assert.deepEqual(win.events, []);
  assert.equal(win.location.search, "?x=2");
  assert.equal(win.location.hash, "#settings-desktop");
});

test("no synthetic hashchange when hash and search both change (pathname-stable only)", () => {
  const win = mockWin("/en/settings", "#settings-privacy", "?x=1");
  const fired = replaceStateMaybeHashchange(
    "/en/settings?x=2#settings-desktop",
    win as never
  );
  assert.equal(fired, false);
  assert.deepEqual(win.events, []);
  assert.equal(win.location.search, "?x=2");
  assert.equal(win.location.hash, "#settings-desktop");
});

test("no synthetic hashchange when pathname changes", () => {
  const win = mockWin("/en/privacy", "#privacy-honest-limits");
  const fired = replaceStateMaybeHashchange("/en/settings#settings-desktop", win as never);
  assert.equal(fired, false);
  assert.deepEqual(win.events, []);
});

test("no synthetic hashchange when hash unchanged", () => {
  const win = mockWin("/en/settings", "#settings-desktop");
  const fired = replaceStateMaybeHashchange("/en/settings#settings-desktop", win as never);
  assert.equal(fired, false);
  assert.deepEqual(win.events, []);
});