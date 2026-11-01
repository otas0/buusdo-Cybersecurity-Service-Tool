import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

const require = createRequire(import.meta.url);
const {
  acceptAnonymousEvent,
  appendAnonymous,
  recordIfEnabled,
  normalizePrivacyMode
} = require("../desktop-app/src/log-store.js");

test("privacy mode defaults to off", () => {
  assert.equal(normalizePrivacyMode(undefined), "off");
  assert.equal(normalizePrivacyMode("nope"), "off");
  assert.equal(normalizePrivacyMode("local"), "local");
  assert.equal(normalizePrivacyMode("share"), "share");
});

test("anonymous events accept only source and threat_type", () => {
  assert.deepEqual(acceptAnonymousEvent({ source: "web", threat_type: "phishing" }), {
    source: "web",
    threat_type: "phishing"
  });
  assert.equal(acceptAnonymousEvent({ source: "web", threat_type: "phishing", url: "https://secret.example" }), null);
  assert.equal(acceptAnonymousEvent({ source: "app" }), null);
});

test("share mode writes only at, source, threat_type", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-log-"));
  const file = path.join(dir, "shield-log.jsonl");
  const result = appendAnonymous({ source: "app", threat_type: "tracker" }, file);
  assert.equal(result.sent, true);
  const saved = JSON.parse(readFileSync(file, "utf8"));
  assert.deepEqual(Object.keys(saved).sort(), ["at", "source", "threat_type"]);
  assert.equal(saved.source, "app");
  assert.equal(saved.threat_type, "tracker");
});

test("recordIfEnabled skips off and local", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-log-"));
  const file = path.join(dir, "shield-log.jsonl");
  process.env.SHIELD_LOG_FILE = file;
  assert.equal(recordIfEnabled("off", "phishing").sent, false);
  assert.equal(recordIfEnabled("local", "phishing").sent, false);
  assert.equal(existsSync(file), false);
  assert.equal(recordIfEnabled("share", "phishing").sent, true);
  assert.equal(existsSync(file), true);
  delete process.env.SHIELD_LOG_FILE;
});