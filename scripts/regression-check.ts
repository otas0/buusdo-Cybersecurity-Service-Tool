/**
 * Smoke regression for first-party website checks (no third-party reputation).
 * Required after every curated-threats.json change (see security/data/README.md).
 */
import assert from "node:assert/strict";
import { analyseWebsite } from "../security/analyse";
import { readCuratedFile, validateCuratedFile } from "../security/curated-ops";

const cases = [
  {
    name: "benign https",
    url: "https://example.com/",
    expectLevels: ["LOW_EVIDENCE", "CAUTION"],
    mustEvidence: ["checked-address", "no-match"]
  },
  {
    name: "curated phishing host",
    url: "https://paypal.secure-login.example/signin",
    expectLevels: ["CRITICAL", "HIGH", "CAUTION"],
    mustEvidence: ["known-threat"]
  },
  {
    name: "http caution",
    url: "http://example.com/",
    expectLevels: ["CAUTION"],
    mustEvidence: ["http"]
  }
] as const;

let failed = 0;

try {
  const curated = readCuratedFile();
  const curatedErrors = validateCuratedFile(curated);
  assert.equal(curatedErrors.length, 0, curatedErrors.join("; "));
  assert.ok(Object.keys(curated.hosts).length >= 1, "curated list must not be empty");
  console.log(`ok  curated-threats.json (${Object.keys(curated.hosts).length} hosts)`);
} catch (err) {
  failed += 1;
  console.error("fail curated-threats.json:", err instanceof Error ? err.message : err);
}

for (const item of cases) {
  try {
    const result = await analyseWebsite(item.url, { live: false });
    assert.ok((item.expectLevels as readonly string[]).includes(result.risk.level), `${item.name}: level ${result.risk.level}`);
    for (const id of item.mustEvidence) {
      assert.ok(
        result.risk.evidence.some((e) => e.id === id),
        `${item.name}: missing evidence ${id}`
      );
    }
    assert.ok(
      !/safe browsing|google/i.test(JSON.stringify(result.threat)),
      `${item.name}: must not reference Google Safe Browsing`
    );
    console.log(`ok  ${item.name}`);
  } catch (err) {
    failed += 1;
    console.error(`fail ${item.name}:`, err instanceof Error ? err.message : err);
  }
}

if (failed) {
  console.error(`\n${failed} regression case(s) failed`);
  process.exit(1);
}
console.log("\nregression-check: all passed (first-party threat path)");