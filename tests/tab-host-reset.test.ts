import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { test } from "node:test";
import {
  nextTabsAfterHostChange,
  registrableHint,
  shouldHandleTabUpdated
} from "../shared/tab-host-reset.mjs";

const require = createRequire(import.meta.url);
const SYNC_ID = "sync-id: tab-host-reset-v2";

/** Extract one top-level `function name(...) { ... }` by brace depth. */
function extractFunction(src: string, name: string): string {
  const needle = `function ${name}`;
  const start = src.indexOf(needle);
  assert.ok(start >= 0, `missing function ${name}`);
  const open = src.indexOf("{", start);
  assert.ok(open >= 0, `missing body for ${name}`);
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  assert.fail(`unclosed function ${name}`);
}

/** Normalize mjs + classic function bodies so drift fails CI. */
function normalizeTabHostLogic(src: string): string {
  const chunk = extractFunction(src, "registrableHint") + extractFunction(src, "nextTabsAfterHostChange");
  return chunk
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/export\s+/g, "")
    .replace(/\s+/g, "");
}

test("shouldHandleTabUpdated gates on url or complete", () => {
  assert.equal(shouldHandleTabUpdated(null), false);
  assert.equal(shouldHandleTabUpdated({}), false);
  assert.equal(shouldHandleTabUpdated({ status: "loading" }), false);
  assert.equal(shouldHandleTabUpdated({ status: "complete" }), true);
  assert.equal(shouldHandleTabUpdated({ url: "https://a.example/" }), true);
  assert.equal(shouldHandleTabUpdated({ url: "https://a.example/", status: "loading" }), true);
});

test("classic ShieldTabHost.shouldHandleTabUpdated after importScripts simulation", () => {
  delete (globalThis as { ShieldTabHost?: unknown }).ShieldTabHost;
  require("../extension/shared/tab-host-reset.classic.js");
  const host = (
    globalThis as {
      ShieldTabHost?: {
        shouldHandleTabUpdated: (changeInfo: unknown) => boolean;
      };
    }
  ).ShieldTabHost;
  assert.ok(host?.shouldHandleTabUpdated, "ShieldTabHost missing after classic load");
  assert.equal(host!.shouldHandleTabUpdated(null), false);
  assert.equal(host!.shouldHandleTabUpdated({}), false);
  assert.equal(host!.shouldHandleTabUpdated({ status: "loading" }), false);
  assert.equal(host!.shouldHandleTabUpdated({ status: "complete" }), true);
  assert.equal(host!.shouldHandleTabUpdated({ url: "https://a.example/" }), true);
  assert.equal(host!.shouldHandleTabUpdated({ url: "https://a.example/", status: "loading" }), true);
});

test("registrableHint returns last two labels", () => {
  assert.equal(registrableHint("https://www.youtube.com/watch?v=1"), "youtube.com");
  assert.equal(registrableHint("https://shop.example/"), "shop.example");
  assert.equal(registrableHint("not-a-url"), "");
});

test("nextTabsAfterHostChange resets trackers when host changes", () => {
  const tabs = {
    "3": { trackers: 4, phishing: 0, lastToastAt: 1, host: "youtube.com" }
  };
  const { changed, tabs: next } = nextTabsAfterHostChange(tabs, 3, "https://news.example/");
  assert.equal(changed, true);
  assert.equal(next["3"].trackers, 0);
  assert.equal(next["3"].phishing, 0);
  assert.equal(next["3"].host, "news.example");
});

test("nextTabsAfterHostChange no-op when host unchanged", () => {
  const tabs = {
    "3": { trackers: 2, phishing: 0, lastToastAt: 0, host: "youtube.com" }
  };
  const { changed, tabs: next } = nextTabsAfterHostChange(tabs, 3, "https://www.youtube.com/");
  assert.equal(changed, false);
  assert.equal(next["3"].trackers, 2);
});

test("nextTabsAfterHostChange stamps host when missing", () => {
  const tabs = {
    "9": { trackers: 1, phishing: 0, lastToastAt: 0 }
  };
  const { changed, tabs: next } = nextTabsAfterHostChange(tabs, 9, "https://apple.com/");
  assert.equal(changed, true);
  assert.equal(next["9"].host, "apple.com");
  assert.equal(next["9"].trackers, 1);
});

test("service worker imports tab-host-reset classic and uses nextTabsAfterHostChange", () => {
  const sw = readFileSync(join(process.cwd(), "extension/background/service-worker.js"), "utf8");
  assert.match(sw, /tab-host-reset\.classic\.js/);
  assert.match(sw, /nextTabsAfterHostChange/);
  assert.doesNotMatch(sw, /function registrableHint\(/);
  assert.match(sw, /URL-gated via shouldHandleTabUpdated/);
  assert.match(sw, /shouldHandleTabUpdated/);
  assert.match(sw, /await resetTabIfHostChanged\(tabId, url\)/);
});

test("tabs.onUpdated complete without changeInfo.url still invokes resetTabIfHostChanged", () => {
  const sw = readFileSync(join(process.cwd(), "extension/background/service-worker.js"), "utf8");
  const start = sw.indexOf("api.tabs.onUpdated.addListener");
  assert.ok(start >= 0);
  const block = sw.slice(start, start + 900);
  assert.match(block, /shouldHandleTabUpdated\(changeInfo\)/);
  assert.match(block, /const url = changeInfo\.url \|\| tab\.url/);
  assert.match(block, /await resetTabIfHostChanged\(tabId, url\)/);
  // Must not gate the reset on changeInfo.url alone (host stamp on complete).
  assert.doesNotMatch(block, /if\s*\(\s*changeInfo\.url\s*\)\s*await resetTabIfHostChanged/);
});

test("tab-host-reset sync-id stays at v2 until intentional dual edit", () => {
  const mjs = readFileSync(join(process.cwd(), "shared/tab-host-reset.mjs"), "utf8");
  const classic = readFileSync(
    join(process.cwd(), "extension/shared/tab-host-reset.classic.js"),
    "utf8"
  );
  assert.match(mjs, /sync-id: tab-host-reset-v2/);
  assert.match(classic, /sync-id: tab-host-reset-v2/);
});

test("tab-host-reset.mjs and classic share sync-id and normalized logic hash", () => {
  const mjs = readFileSync(join(process.cwd(), "shared/tab-host-reset.mjs"), "utf8");
  const classic = readFileSync(
    join(process.cwd(), "extension/shared/tab-host-reset.classic.js"),
    "utf8"
  );
  assert.match(mjs, new RegExp(SYNC_ID.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(classic, new RegExp(SYNC_ID.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const a = createHash("sha256").update(normalizeTabHostLogic(mjs)).digest("hex");
  const b = createHash("sha256").update(normalizeTabHostLogic(classic)).digest("hex");
  assert.equal(
    a,
    b,
    "tab-host-reset.mjs and tab-host-reset.classic.js logic drifted — update both and bump sync-id"
  );
});