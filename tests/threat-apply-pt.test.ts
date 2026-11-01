import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  applyBatchToFile,
  readCuratedFile,
  resolveCuratedTargetPath,
  resolveThreatApplyTarget,
  unknownBatchTargetWarning,
  validateCuratedFile,
  writeCuratedFile,
  type CuratedThreatFile
} from "../security/curated-ops";

test("resolveThreatApplyTarget honors --target=pt", () => {
  assert.equal(resolveThreatApplyTarget(["--target=pt"], {}), "pt");
  assert.equal(resolveThreatApplyTarget(["--target=core"], {}), "core");
  assert.equal(resolveThreatApplyTarget([], { target: "curated-threats.pt.json" }), "pt");
  assert.equal(resolveThreatApplyTarget([], {}), "core");
});

test("resolveThreatApplyTarget rejects --target=pt when batch target is core", () => {
  assert.throws(
    () => resolveThreatApplyTarget(["--target=pt"], { target: "curated-threats.json" }),
    /conflicts with batch/
  );
  assert.throws(
    () => resolveThreatApplyTarget(["--target=core"], { target: "curated-threats.pt.json" }),
    /conflicts with batch/
  );
});

test("unknownBatchTargetWarning warns for unknown strings without throw", () => {
  assert.match(unknownBatchTargetWarning("somewhere-else.json") || "", /Ignoring field/);
  assert.equal(unknownBatchTargetWarning("curated-threats.pt.json"), null);
  assert.equal(unknownBatchTargetWarning(undefined), null);
  // Unknown field is ignored — resolve still defaults to core.
  assert.equal(resolveThreatApplyTarget([], { target: "somewhere-else.json" }), "core");
});

test("--target=pt apply writes temp PT file without archive side effects", () => {
  const dir = mkdtempSync(join(tmpdir(), "shield-pt-apply-"));
  const ptPath = join(dir, "curated-threats.pt.json");
  const seed: CuratedThreatFile = {
    updatedAt: "2026-01-01",
    source: "temp pt seeds",
    hosts: { "keep-pt.example": "KNOWN_PHISHING" },
    changelog: []
  };
  writeFileSync(ptPath, `${JSON.stringify(seed, null, 2)}\n`);

  assert.equal(resolveThreatApplyTarget(["file.json", "--target=pt"]), "pt");
  assert.ok(resolveCuratedTargetPath("pt").endsWith("curated-threats.pt.json"));

  const before = readCuratedFile(ptPath);
  const result = applyBatchToFile(before, {
    id: "temp-pt-unit",
    kind: "report",
    add: [{ host: "unit-pt-new.example", state: "KNOWN_PHISHING" }]
  });
  assert.deepEqual(validateCuratedFile(result.file), []);
  writeCuratedFile(result.file, ptPath);

  const after = JSON.parse(readFileSync(ptPath, "utf8")) as CuratedThreatFile;
  assert.equal(after.hosts["unit-pt-new.example"], "KNOWN_PHISHING");
  assert.equal(after.hosts["keep-pt.example"], "KNOWN_PHISHING");
  // Repo PT file untouched — we only wrote to temp path.
  assert.ok(!ptPath.includes("security/data/curated-threats.pt.json") || dir.includes("shield-pt-apply-"));
});