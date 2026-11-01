import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyBatchToFile,
  normalizeHost,
  readCuratedFile,
  validateCuratedFile,
  writeCuratedFile,
  type CuratedThreatFile
} from "../security/curated-ops";

test("normalizeHost strips protocol, path, www, and trailing dot", () => {
  assert.equal(normalizeHost("https://WWW.Bad-Host.Example./login"), "bad-host.example");
});

test("applyBatchToFile adds reports and removes false positives", () => {
  const base: CuratedThreatFile = {
    updatedAt: "2026-01-01",
    source: "test",
    hosts: { "keep.example": "KNOWN_PHISHING", "remove-me.example": "KNOWN_MALICIOUS" },
    changelog: []
  };
  const result = applyBatchToFile(base, {
    id: "2026-10-21-ops-test",
    kind: "mixed",
    notes: "unit test",
    add: [{ host: "https://NEW-PHISH.Example/path", state: "KNOWN_PHISHING", reason: "report" }],
    remove: [{ host: "remove-me.example", reason: "false positive" }]
  });
  assert.deepEqual(result.added, ["new-phish.example"]);
  assert.deepEqual(result.removed, ["remove-me.example"]);
  assert.equal(result.file.hosts["new-phish.example"], "KNOWN_PHISHING");
  assert.equal(result.file.hosts["keep.example"], "KNOWN_PHISHING");
  assert.equal(result.file.hosts["remove-me.example"], undefined);
  assert.equal(result.file.changelog?.[0]?.batchId, "2026-10-21-ops-test");
});

test("validateCuratedFile rejects non-list states", () => {
  const errors = validateCuratedFile({
    updatedAt: "2026-01-01",
    source: "test",
    hosts: { "ok.example": "KNOWN_PHISHING", "bad.example": "NO_KNOWN_MATCH" }
  });
  assert.ok(errors.some((e) => e.includes("bad.example")));
});

test("repo curated-threats.json validates and round-trips", () => {
  const file = readCuratedFile();
  assert.equal(validateCuratedFile(file).length, 0);
  assert.ok(Object.keys(file.hosts).length >= 1);
  const dir = mkdtempSync(join(tmpdir(), "shield-curated-"));
  const path = join(dir, "curated-threats.json");
  writeCuratedFile(file, path);
  const again = JSON.parse(readFileSync(path, "utf8")) as CuratedThreatFile;
  assert.deepEqual(Object.keys(again.hosts).sort(), Object.keys(file.hosts).sort());
});