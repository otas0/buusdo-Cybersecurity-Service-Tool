import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);

test("desktop threats.countThirdPartyTrackers ignores same-brand YouTube stack", async () => {
  delete require.cache[require.resolve("../desktop-app/src/threats.js")];
  const threats = require("../desktop-app/src/threats.js");
  await threats.loadDetector();
  const n = threats.countThirdPartyTrackers("https://www.youtube.com/watch?v=1", [
    "https://googleads.g.doubleclick.net/pagead/id",
    "https://www.google-analytics.com/g/collect",
    "https://hotjar.com/foo.js"
  ]);
  assert.equal(n, 1);
});

test("desktop threats.countThirdPartyTrackers ignores same-brand Snapchat sc-static stack", async () => {
  delete require.cache[require.resolve("../desktop-app/src/threats.js")];
  const threats = require("../desktop-app/src/threats.js");
  await threats.loadDetector();
  const n = threats.countThirdPartyTrackers("https://www.snapchat.com/", [
    "https://sc-static.net/scevent.min.js",
    "https://tr.snapads.com/p",
    "https://hotjar.com/foo.js"
  ]);
  assert.equal(n, 1);
});

test("desktop /api/scan source wires countThirdPartyTrackers(resources)", () => {
  const server = require("node:fs").readFileSync(
    require("node:path").join(process.cwd(), "desktop-app/src/server.js"),
    "utf8"
  );
  assert.match(server, /countThirdPartyTrackers/);
  assert.match(server, /req\.body\?\.resources/);
  assert.match(server, /thirdPartyTrackers/);
  assert.equal(/\/api\/log\/clear-ring/.test(server.replace(/\/\/[^\n]*/g, "")), false);
});