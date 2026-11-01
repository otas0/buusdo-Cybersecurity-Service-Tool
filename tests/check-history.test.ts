import test from "node:test";
import assert from "node:assert/strict";
import {
  filterCheckHistory,
  summarizeHeadFails,
  summarizeProbeTimeouts,
  type CheckHistoryEntry
} from "../components/check-history";
import { fullHistoryToCsv, timeoutSummaryToCsv } from "../components/check-history-csv";
import {
  lastHeaderPreferredDiagnostic,
  summarizeDiagnosticErrors,
  type DiagnosticEntry
} from "../components/diagnostic-log";

test("filterCheckHistory supports timeouts, HEAD-skipped, and probeBlocked", () => {
  const history: CheckHistoryEntry[] = [
    { at: "1", domain: "a.example", level: "CAUTION", probeMs: 100, timedOut: true, headSkipped: false },
    { at: "2", domain: "b.example", level: "LOW_EVIDENCE", probeMs: 80, timedOut: false, headSkipped: true },
    { at: "3", domain: "c.example", level: "CAUTION", probeMs: 90, timedOut: true, headSkipped: true },
    {
      at: "4",
      domain: "d.example",
      level: "LOW_EVIDENCE",
      probeMs: 40,
      timedOut: false,
      probeBlocked: true
    }
  ];
  assert.equal(filterCheckHistory(history, "all").length, 4);
  assert.deepEqual(
    filterCheckHistory(history, "timeouts").map((e) => e.domain),
    ["a.example", "c.example"]
  );
  assert.deepEqual(
    filterCheckHistory(history, "headSkipped").map((e) => e.domain),
    ["b.example", "c.example"]
  );
  assert.deepEqual(
    filterCheckHistory(history, "probeBlocked").map((e) => e.domain),
    ["d.example"]
  );
});

test("summarizeProbeTimeouts ranks repeat timeouts", () => {
  const history: CheckHistoryEntry[] = [
    { at: "1", domain: "slow.example", level: "CAUTION", probeMs: 5000, timedOut: true, probeTimeoutMs: 5000 },
    { at: "2", domain: "slow.example", level: "CAUTION", probeMs: 4980, timedOut: true, probeTimeoutMs: 5000 },
    { at: "3", domain: "ok.example", level: "LOW_EVIDENCE", probeMs: 120, timedOut: false, probeTimeoutMs: 5000 },
    { at: "4", domain: "once.example", level: "UNKNOWN", probeMs: 5000, timedOut: true, probeTimeoutMs: 5000 }
  ];
  const summary = summarizeProbeTimeouts(history);
  assert.equal(summary.length, 2);
  assert.equal(summary[0].domain, "slow.example");
  assert.equal(summary[0].timeouts, 2);
  assert.equal(summary[0].checks, 2);
  assert.equal(summary[1].domain, "once.example");
  assert.equal(summary[1].timeouts, 1);
});

test("summarizeHeadFails requires repeated HEAD failures", () => {
  const history: CheckHistoryEntry[] = [
    { at: "1", domain: "head.example", level: "CAUTION", probeMs: 200, timedOut: false, probeHeadFailed: true },
    { at: "2", domain: "head.example", level: "CAUTION", probeMs: 180, timedOut: false, probeHeadFailed: true },
    { at: "3", domain: "once.example", level: "LOW_EVIDENCE", probeMs: 90, timedOut: false, probeHeadFailed: true }
  ];
  const summary = summarizeHeadFails(history);
  assert.equal(summary.length, 1);
  assert.equal(summary[0].domain, "head.example");
  assert.equal(summary[0].headFails, 2);
});

test("timeoutSummaryToCsv includes probeTimeoutMs and headFails columns", () => {
  const history: CheckHistoryEntry[] = [
    {
      at: "1",
      domain: "slow.example",
      level: "CAUTION",
      probeMs: 5000,
      timedOut: true,
      probeTimeoutMs: 5000,
      probeHeadFailed: true
    }
  ];
  const csv = timeoutSummaryToCsv(history);
  assert.match(
    csv,
    /^domain,timeouts,checks,maxProbeMs,lastProbeMs,probeTimeoutMs,headFails,headSkips,probeBlocked\n/
  );
  assert.match(csv, /slow\.example,1,1,5000,5000,5000,1,0,0/);
});

test("fullHistoryToCsv exports every check row", () => {
  const history: CheckHistoryEntry[] = [
    {
      at: "2026-01-01T00:00:00.000Z",
      domain: "a.example",
      level: "LOW_EVIDENCE",
      probeMs: 10,
      timedOut: false,
      probeTimeoutMs: 5000,
      probeHeadFailed: false
    },
    {
      at: "2026-01-01T00:01:00.000Z",
      domain: "b.example",
      level: "CAUTION",
      probeMs: 5000,
      timedOut: true,
      probeTimeoutMs: 5000,
      probeHeadFailed: true
    }
  ];
  const csv = fullHistoryToCsv(history);
  assert.match(
    csv,
    /^at,domain,level,probeMs,timedOut,probeTimeoutMs,probeHeadFailed,headSkipped,probeBlocked\n/
  );
  assert.match(csv, /a\.example,LOW_EVIDENCE,10,0,5000,0,0,0/);
  const timeouts = fullHistoryToCsv(history, "timedOut");
  assert.match(timeouts, /b\.example/);
  assert.equal(timeouts.trim().split("\n").length, 2);
  const heads = fullHistoryToCsv(history, "headFail");
  assert.match(heads, /b\.example/);
  assert.equal(heads.trim().split("\n").length, 2);
  const blocked: CheckHistoryEntry[] = [
    {
      at: "2026-01-01T00:02:00.000Z",
      domain: "bot.example",
      level: "LOW_EVIDENCE",
      probeMs: 40,
      timedOut: false,
      probeBlocked: true
    },
    {
      at: "2026-01-01T00:03:00.000Z",
      domain: "ok.example",
      level: "LOW_EVIDENCE",
      probeMs: 20,
      timedOut: false,
      probeBlocked: false
    }
  ];
  const probeOnly = fullHistoryToCsv(blocked, "probeBlocked");
  assert.match(probeOnly, /bot\.example/);
  assert.doesNotMatch(probeOnly, /ok\.example/);
  assert.equal(probeOnly.trim().split("\n").length, 2);
});

test("summarizeDiagnosticErrors aggregates by code", () => {
  const entries: DiagnosticEntry[] = [
    { at: "1", error: "rate-limited", source: "web" },
    { at: "2", error: "rate-limited", source: "web" },
    { at: "3", error: "timeout", source: "web" }
  ];
  const summary = summarizeDiagnosticErrors(entries);
  assert.equal(summary[0].error, "rate-limited");
  assert.equal(summary[0].count, 2);
  assert.equal(summary[1].error, "timeout");
  assert.equal(summary[1].count, 1);
});

test("lastHeaderPreferredDiagnostic keeps newest deltaSec for Settings one-liner", () => {
  const entries: DiagnosticEntry[] = [
    { at: "1", error: "rate-limited-header-preferred", source: "web", deltaSec: 10 },
    { at: "3", error: "rate-limited-header-preferred", source: "web", deltaSec: 30 },
    { at: "2", error: "rate-limited", source: "web" }
  ];
  const last = lastHeaderPreferredDiagnostic(entries);
  assert.equal(last?.at, "3");
  assert.equal(last?.deltaSec, 30);
  const summary = summarizeDiagnosticErrors(entries);
  const pref = summary.find((r) => r.error === "rate-limited-header-preferred");
  assert.equal(pref?.lastDeltaSec, 30);
  assert.equal(pref?.count, 2);
});

test("lastHeaderPreferredDiagnostic empty → null", () => {
  assert.equal(lastHeaderPreferredDiagnostic([]), null);
  assert.equal(
    lastHeaderPreferredDiagnostic([{ at: "1", error: "rate-limited", source: "web" }]),
    null
  );
});