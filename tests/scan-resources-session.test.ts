import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearPersistedScanResourcesStorage,
  countFixtureLines,
  fixtureStringLength,
  readPersistedScanResources,
  SCAN_RESOURCES_KEY,
  shouldPersistScanResources,
  writePersistedScanResources
} from "../desktop-app/public/js/scan-resources-session.mjs";

function memoryStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem(k: string) {
      return map.has(k) ? map.get(k)! : null;
    },
    setItem(k: string, v: string) {
      map.set(k, String(v));
    },
    removeItem(k: string) {
      map.delete(k);
    },
    _map: map
  };
}

test("shouldPersistScanResources only for local/share", () => {
  assert.equal(shouldPersistScanResources("off"), false);
  assert.equal(shouldPersistScanResources("local"), true);
  assert.equal(shouldPersistScanResources("share"), true);
  assert.equal(shouldPersistScanResources("unknown"), false);
});

test("writePersistedScanResources skips and clears when privacy is off", () => {
  const storage = memoryStorage({ [SCAN_RESOURCES_KEY]: "https://hotjar.com/x.js" });
  const wrote = writePersistedScanResources("https://ads.example/t.js", "off", storage);
  assert.equal(wrote, false);
  assert.equal(storage.getItem(SCAN_RESOURCES_KEY), null);
});

test("write/read round-trip when privacy is local", () => {
  const storage = memoryStorage();
  const body = "https://hotjar.com/a.js\nhttps://hotjar.com/b.js";
  assert.equal(writePersistedScanResources(body, "local", storage), true);
  assert.equal(readPersistedScanResources(storage), body);
  clearPersistedScanResourcesStorage(storage);
  assert.equal(readPersistedScanResources(storage), "");
});

test("writePersistedScanResources when share keeps value", () => {
  const storage = memoryStorage();
  assert.equal(writePersistedScanResources("https://x.test/", "share", storage), true);
  assert.equal(storage.getItem(SCAN_RESOURCES_KEY), "https://x.test/");
});

test("countFixtureLines and fixtureStringLength for smoke assert messages", () => {
  const snap = ["https://sc-static.net/scevent.min.js", "https://hotjar.com/foo.js"].join("\n");
  const yt = "https://googleads.g.doubleclick.net/pagead/id";
  assert.equal(countFixtureLines(snap), 2);
  assert.equal(countFixtureLines(yt), 1);
  assert.equal(countFixtureLines(""), 0);
  assert.equal(countFixtureLines("a\n\n b \n"), 2);
  assert.equal(fixtureStringLength(snap), snap.length);
  assert.equal(fixtureStringLength(yt), yt.length);
});