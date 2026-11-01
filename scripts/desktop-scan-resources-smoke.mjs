#!/usr/bin/env node
/**
 * Playwright-free smoke: privacy "off" clears SCAN_RESOURCES_KEY session prefs
 * + Snapchat/YouTube same-brand resource fixtures (countThirdPartyTrackers).
 * Run: node scripts/desktop-scan-resources-smoke.mjs
 */
import {
  clearPersistedScanResourcesStorage,
  countFixtureLines,
  fixtureStringLength,
  readPersistedScanResources,
  SCAN_RESOURCES_KEY,
  shouldPersistScanResources,
  writePersistedScanResources
} from "../desktop-app/public/js/scan-resources-session.mjs";
import { countThirdPartyTrackers } from "../shared/detect.mjs";

function memoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(k, String(v));
    },
    removeItem(k) {
      map.delete(k);
    }
  };
}

function assert(cond, msg) {
  if (!cond) {
    console.error("[smoke:desktop-scan-resources] FAIL:", msg);
    process.exit(1);
  }
}

const storage = memoryStorage();
assert(shouldPersistScanResources("local") === true, "local should persist");
assert(shouldPersistScanResources("off") === false, "off should not persist");

assert(
  writePersistedScanResources("https://hotjar.com/a.js", "local", storage) === true,
  "write under local"
);
assert(readPersistedScanResources(storage) === "https://hotjar.com/a.js", "read back");

assert(
  writePersistedScanResources("https://hotjar.com/b.js", "off", storage) === false,
  "write under off rejected"
);
assert(storage.getItem(SCAN_RESOURCES_KEY) === null, "privacy off clears session key");

writePersistedScanResources("https://hotjar.com/c.js", "share", storage);
clearPersistedScanResourcesStorage(storage);
assert(readPersistedScanResources(storage) === "", "explicit clear empties");

/** Manual QA fixtures from desktop-app/README — same-brand must not bump third-party count. */
const snapFixtureLines = [
  "https://sc-static.net/scevent.min.js",
  "https://hotjar.com/foo.js"
].join("\n");

assert(
  writePersistedScanResources(snapFixtureLines, "local", storage) === true,
  `persist Snapchat fixture lines under privacy local (len=${fixtureStringLength(snapFixtureLines)}, lines=${countFixtureLines(snapFixtureLines)})`
);
assert(
  readPersistedScanResources(storage) === snapFixtureLines,
  `Snapchat fixture lines read back under local (len=${fixtureStringLength(snapFixtureLines)}, lines=${countFixtureLines(snapFixtureLines)})`
);
assert(
  writePersistedScanResources(snapFixtureLines, "off", storage) === false,
  `privacy off rejects Snapchat fixture write (len=${fixtureStringLength(snapFixtureLines)}, lines=${countFixtureLines(snapFixtureLines)})`
);
assert(
  storage.getItem(SCAN_RESOURCES_KEY) === null,
  `privacy off clears Snapchat fixture session key (len=${fixtureStringLength(snapFixtureLines)}, lines=${countFixtureLines(snapFixtureLines)})`
);

const ytFixtureLines = "https://googleads.g.doubleclick.net/pagead/id";
assert(
  writePersistedScanResources(ytFixtureLines, "local", storage) === true,
  `persist YouTube doubleclick fixture under privacy local (len=${fixtureStringLength(ytFixtureLines)}, lines=${countFixtureLines(ytFixtureLines)})`
);
assert(
  readPersistedScanResources(storage) === ytFixtureLines,
  `YouTube fixture read back (len=${fixtureStringLength(ytFixtureLines)}, lines=${countFixtureLines(ytFixtureLines)})`
);
assert(
  writePersistedScanResources(ytFixtureLines, "off", storage) === false,
  `privacy off rejects YouTube fixture write (len=${fixtureStringLength(ytFixtureLines)}, lines=${countFixtureLines(ytFixtureLines)})`
);
assert(
  storage.getItem(SCAN_RESOURCES_KEY) === null,
  `privacy off clears YouTube fixture session key (len=${fixtureStringLength(ytFixtureLines)}, lines=${countFixtureLines(ytFixtureLines)})`
);

const snapResources = ["https://sc-static.net/scevent.min.js"];
const snapPlusHotjarResources = [
  "https://sc-static.net/scevent.min.js",
  "https://hotjar.com/foo.js"
];
const ytResources = ["https://googleads.g.doubleclick.net/pagead/id"];

const snapOnly = countThirdPartyTrackers("https://www.snapchat.com/", snapResources);
assert(snapOnly === 0, `Snapchat sc-static alone expected 0, got ${snapOnly}`);

const snapPlusHotjar = countThirdPartyTrackers(
  "https://www.snapchat.com/",
  snapPlusHotjarResources
);
assert(snapPlusHotjar === 1, `Snapchat + hotjar expected 1, got ${snapPlusHotjar}`);

const ytOnly = countThirdPartyTrackers("https://www.youtube.com/", ytResources);
assert(ytOnly === 0, `YouTube doubleclick alone expected 0, got ${ytOnly}`);

console.info(
  "[smoke:desktop-scan-resources] ok — privacy off clears session fixtures; same-brand counts",
  {
    snapFixtureLines: countFixtureLines(snapFixtureLines),
    ytFixtureLines: countFixtureLines(ytFixtureLines),
    snapResources: snapResources.length,
    snapPlusHotjarResources: snapPlusHotjarResources.length,
    ytResources: ytResources.length,
    snapOnly,
    snapPlusHotjar,
    ytOnly
  }
);
process.exit(0);