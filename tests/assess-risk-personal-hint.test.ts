import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { assessRisk } from "../security/risk";
import { USER_BLOCK_EVIDENCE_ID } from "../security/evidence-ids";
import { parseUrl } from "../security/url";
import type { RiskAssessment, RiskLevel } from "../security/types";

const noMatch = {
  state: "NO_KNOWN_MATCH" as const,
  providerName: "test",
  checkedAt: "now",
  evidence: [] as string[]
};

test("assessRisk personalListBlocked on LOW_EVIDENCE prefers LEAVE", () => {
  const parsed = parseUrl("https://ordinary-garden.test/");
  const risk = assessRisk(parsed, noMatch, { state: "NO_CLAIM" }, null, null, null, {
    personalListBlocked: true
  });
  assert.equal(risk.level, "LOW_EVIDENCE");
  assert.equal(risk.recommendation, "LEAVE");
  assert.ok(risk.evidence.some((e) => e.id === USER_BLOCK_EVIDENCE_ID));
});

test("assessRisk without hint keeps PROCEED_WITH_CARE on LOW_EVIDENCE", () => {
  const parsed = parseUrl("https://ordinary-garden.test/");
  const risk = assessRisk(parsed, noMatch, { state: "NO_CLAIM" }, null, null, null);
  assert.equal(risk.level, "LOW_EVIDENCE");
  assert.equal(risk.recommendation, "PROCEED_WITH_CARE");
  assert.ok(!risk.evidence.some((e) => e.id === USER_BLOCK_EVIDENCE_ID));
});

test("assessRisk personalListBlocked keeps LEAVE on HIGH known threat", () => {
  const parsed = parseUrl("https://malicious-demo.test/");
  const risk = assessRisk(
    parsed,
    { state: "KNOWN_MALICIOUS", providerName: "test", checkedAt: "now", evidence: [] },
    { state: "NO_CLAIM" },
    null,
    null,
    null,
    { personalListBlocked: true }
  );
  assert.equal(risk.level, "HIGH");
  assert.equal(risk.recommendation, "LEAVE");
  assert.ok(risk.evidence.some((e) => e.id === USER_BLOCK_EVIDENCE_ID));
});

test("personalListBlocked recommendation matrix by risk level", () => {
  type Row = {
    name: string;
    run: () => RiskAssessment;
    level: RiskAssessment["level"];
    recommendation: RiskAssessment["recommendation"];
  };

  const rows: Row[] = [
    {
      name: "LOW_EVIDENCE → LEAVE",
      run: () =>
        assessRisk(parseUrl("https://ordinary-garden.test/"), noMatch, { state: "NO_CLAIM" }, null, null, null, {
          personalListBlocked: true
        }),
      level: "LOW_EVIDENCE",
      recommendation: "LEAVE"
    },
    {
      name: "HIGH → LEAVE (unchanged)",
      run: () =>
        assessRisk(
          parseUrl("https://malicious-demo.test/"),
          { state: "KNOWN_MALICIOUS", providerName: "test", checkedAt: "now", evidence: [] },
          { state: "NO_CLAIM" },
          null,
          null,
          null,
          { personalListBlocked: true }
        ),
      level: "HIGH",
      recommendation: "LEAVE"
    },
    {
      name: "CRITICAL → LEAVE_AND_BLOCK (unchanged)",
      run: () =>
        assessRisk(
          parseUrl("https://lusitania-bank-login.test/secure"),
          { state: "KNOWN_PHISHING", providerName: "test", checkedAt: "now", evidence: [] },
          {
            state: "DOMAIN_MISMATCH",
            claimedOrganisation: {
              id: "lusitania-bank",
              name: "Lusitania Bank",
              domains: ["lusitaniabank.test"],
              fictional: true
            }
          },
          "password",
          null,
          null,
          { personalListBlocked: true }
        ),
      level: "CRITICAL",
      recommendation: "LEAVE_AND_BLOCK"
    },
    {
      name: "CAUTION → VERIFY_INDEPENDENTLY (unchanged)",
      run: () =>
        assessRisk(
          parseUrl("http://ordinary-garden.test/"),
          noMatch,
          { state: "NO_CLAIM" },
          null,
          null,
          null,
          { personalListBlocked: true }
        ),
      level: "CAUTION",
      recommendation: "VERIFY_INDEPENDENTLY"
    },
    {
      name: "UNKNOWN → VERIFY_INDEPENDENTLY (unchanged)",
      run: () =>
        assessRisk(
          parseUrl("https://ordinary-garden.test/"),
          { state: "PROVIDER_UNAVAILABLE", providerName: "test", checkedAt: "now", evidence: [] },
          { state: "NO_CLAIM" },
          null,
          null,
          null,
          { personalListBlocked: true }
        ),
      level: "UNKNOWN",
      recommendation: "VERIFY_INDEPENDENTLY"
    }
  ];

  // Mirror security/types.ts RiskLevel — fails when the union grows until a new row is added.
  const typesSrc = readFileSync(join(process.cwd(), "security/types.ts"), "utf8");
  const unionMatch = typesSrc.match(/export type RiskLevel = ([^;]+);/);
  assert.ok(unionMatch, "RiskLevel union in types.ts");
  const fromTypes = [...unionMatch![1].matchAll(/"([A-Z_]+)"/g)].map((m) => m[1] as RiskLevel);
  const covered = [...new Set(rows.map((r) => r.level))].sort();
  assert.deepEqual(covered, [...fromTypes].sort(), "matrix must cover every RiskLevel in types.ts");

  for (const row of rows) {
    const risk = row.run();
    assert.equal(risk.level, row.level, row.name);
    assert.equal(risk.recommendation, row.recommendation, row.name);
    assert.ok(risk.evidence.some((e) => e.id === USER_BLOCK_EVIDENCE_ID), row.name);
  }
});