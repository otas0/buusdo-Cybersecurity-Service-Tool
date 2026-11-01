import assert from "node:assert/strict";
import { test } from "node:test";
import { countThirdPartyTrackers, sameBrandFamily } from "../shared/detect.mjs";

test("youtube.com and doubleclick.net share Google brand family", () => {
  assert.equal(sameBrandFamily("youtube.com", "doubleclick.net"), true);
  assert.equal(sameBrandFamily("www.youtube.com", "google-analytics.com"), true);
  assert.equal(sameBrandFamily("shop.example", "doubleclick.net"), false);
});

test("countThirdPartyTrackers ignores first-party YouTube ad stack", () => {
  const page = "https://www.youtube.com/watch?v=1";
  const n = countThirdPartyTrackers(page, [
    "https://www.youtube.com/s/player.js",
    "https://static.doubleclick.net/instream/ad_status.js",
    "https://www.google-analytics.com/g/collect",
    "https://hotjar.com/foo.js"
  ]);
  assert.equal(n, 1);
});

test("YouTube tab resources never bump third-party count from DoubleClick alone", () => {
  const page = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  const n = countThirdPartyTrackers(page, [
    "https://static.doubleclick.net/instream/ad_status.js",
    "https://googleads.g.doubleclick.net/pagead/id",
    "https://www.google-analytics.com/g/collect"
  ]);
  assert.equal(n, 0);
});

test("Microsoft / Adobe first-party ad stacks are sameBrandFamily", () => {
  assert.equal(sameBrandFamily("www.microsoft.com", "bat.bing.com"), true);
  assert.equal(sameBrandFamily("office.com", "clarity.ms"), true);
  assert.equal(sameBrandFamily("adobe.com", "demdex.net"), true);
  assert.equal(sameBrandFamily("adobe.com", "omtrdc.net"), true);
  assert.equal(sameBrandFamily("shop.example", "clarity.ms"), false);
  const ms = countThirdPartyTrackers("https://www.microsoft.com/", [
    "https://bat.bing.com/bat.js",
    "https://www.clarity.ms/tag/x",
    "https://hotjar.com/foo.js"
  ]);
  assert.equal(ms, 1);
  const adobe = countThirdPartyTrackers("https://www.adobe.com/", [
    "https://dpm.demdex.net/id",
    "https://hotjar.com/foo.js"
  ]);
  assert.equal(adobe, 1);
});

test("Apple metrics / ads hosts are sameBrandFamily and do not bump third-party count", () => {
  assert.equal(sameBrandFamily("www.apple.com", "metrics.apple.com"), true);
  assert.equal(sameBrandFamily("apple.com", "iadsdk.apple.com"), true);
  assert.equal(sameBrandFamily("icloud.com", "metrics.icloud.com"), true);
  const n = countThirdPartyTrackers("https://www.apple.com/", [
    "https://metrics.apple.com/b",
    "https://securemetrics.apple.com/b",
    "https://iadsdk.apple.com/ad",
    "https://hotjar.com/foo.js"
  ]);
  assert.equal(n, 1);
});

test("Amazon adsystem hosts are sameBrandFamily and do not bump third-party count", () => {
  assert.equal(sameBrandFamily("www.amazon.com", "amazon-adsystem.com"), true);
  assert.equal(sameBrandFamily("amazon.es", "aax.amazon-adsystem.com"), true);
  const n = countThirdPartyTrackers("https://www.amazon.com/dp/1", [
    "https://aax.amazon-adsystem.com/x",
    "https://fls-na.amazon-adsystem.com/y",
    "https://hotjar.com/foo.js"
  ]);
  assert.equal(n, 1);
});

test("LinkedIn ads hosts are sameBrandFamily and do not bump third-party count", () => {
  assert.equal(sameBrandFamily("www.linkedin.com", "ads.linkedin.com"), true);
  assert.equal(sameBrandFamily("linkedin.com", "px.ads.linkedin.com"), true);
  const n = countThirdPartyTrackers("https://www.linkedin.com/feed/", [
    "https://ads.linkedin.com/li/",
    "https://px.ads.linkedin.com/collect",
    "https://hotjar.com/foo.js"
  ]);
  assert.equal(n, 1);
});

test("Twitter/X ads hosts are sameBrandFamily and do not bump third-party count", () => {
  assert.equal(sameBrandFamily("x.com", "ads.twitter.com"), true);
  assert.equal(sameBrandFamily("twitter.com", "analytics.twitter.com"), true);
  assert.equal(sameBrandFamily("x.com", "static.ads-twitter.com"), true);
  const n = countThirdPartyTrackers("https://x.com/home", [
    "https://ads.twitter.com/onrt/optout",
    "https://analytics.twitter.com/i/adsct",
    "https://static.ads-twitter.com/uwt.js",
    "https://hotjar.com/foo.js"
  ]);
  assert.equal(n, 1);
});

test("Snapchat ads hosts are sameBrandFamily and do not bump third-party count", () => {
  assert.equal(sameBrandFamily("www.snapchat.com", "sc-static.net"), true);
  assert.equal(sameBrandFamily("snapchat.com", "snapads.com"), true);
  assert.equal(sameBrandFamily("snap.com", "sc-static.net"), true);
  const n = countThirdPartyTrackers("https://www.snapchat.com/", [
    "https://sc-static.net/scevent.min.js",
    "https://tr.snapads.com/p",
    "https://hotjar.com/foo.js"
  ]);
  assert.equal(n, 1);
});

test("Snapchat-only sc-static (no hotjar) stays 0 third-party — detect.mjs JSDoc hosts", () => {
  const n = countThirdPartyTrackers("https://www.snapchat.com/", [
    "https://sc-static.net/scevent.min.js"
  ]);
  assert.equal(n, 0);
});