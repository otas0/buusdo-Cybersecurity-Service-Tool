import assert from "node:assert/strict";
import { test } from "node:test";
import { messages } from "../i18n/messages";
import { analyseWebsite } from "../security/analyse";
import type { LiveProbe } from "../security/site-signals";
import { ambiguousProbeBlockedCopy, isAmbiguousProbeStatus } from "../security/site-signals";
import { ambiguousProbeBlockedCopy as fromLiveProbe } from "../security/live-probe";

function live(partial: Partial<LiveProbe>): LiveProbe {
  return {
    resolved: true,
    addresses: ["1.1.1.1"],
    reachable: true,
    statusCode: 200,
    finalUrl: "https://youtube.com/",
    redirectChain: ["https://youtube.com/"],
    redirected: false,
    crossDomainRedirect: false,
    tlsOk: true,
    error: null,
    timedOut: false,
    probeHeadFailed: false,
    ...partial
  };
}

test("isAmbiguousProbeStatus covers 403/429/503 only", () => {
  assert.equal(isAmbiguousProbeStatus(403), true);
  assert.equal(isAmbiguousProbeStatus(429), true);
  assert.equal(isAmbiguousProbeStatus(503), true);
  assert.equal(isAmbiguousProbeStatus(404), false);
  assert.equal(isAmbiguousProbeStatus(401), false);
  assert.equal(isAmbiguousProbeStatus(502), false);
  assert.equal(isAmbiguousProbeStatus(520), false);
  assert.equal(isAmbiguousProbeStatus(200), false);
});

test("403 vs 429 vs 503 probe-blocked copy differs without escalating", () => {
  const c403 = ambiguousProbeBlockedCopy(403);
  const c429 = ambiguousProbeBlockedCopy(429);
  const c503 = ambiguousProbeBlockedCopy(503);
  assert.match(c403.detail, /403/);
  assert.match(c403.title, /refused/i);
  assert.match(c429.detail, /429/);
  assert.match(c429.title, /throttled/i);
  assert.match(c503.detail, /503/);
  assert.match(c503.title, /unavailable/i);
  assert.notEqual(c403.detail, c429.detail);
  assert.notEqual(c429.detail, c503.detail);
  assert.deepEqual(fromLiveProbe(429), c429);
  // EN copy is wired from i18n probeBlocked* keys (security/probe-blocked-copy.ts).
  assert.equal(c403.title, messages.en.probeBlocked403Title);
  assert.equal(c429.detail, messages.en.probeBlocked429Detail);
});

test("401/502/520 escalate to CAUTION (not ambiguous); 403/429/503 stay LOW_EVIDENCE", async () => {
  for (const statusCode of [401, 502, 520]) {
    const result = await analyseWebsite("https://edge.example/", { live: live({ statusCode }) });
    assert.equal(result.risk.level, "CAUTION", `status ${statusCode}`);
    assert.ok(result.risk.evidence.some((e) => e.id === "http-status"), `status ${statusCode}`);
    assert.equal(result.timing.ambiguousProbeStatus, false, `status ${statusCode}`);
  }
  for (const statusCode of [403, 429, 503]) {
    const result = await analyseWebsite("https://edge.example/", { live: live({ statusCode }) });
    assert.equal(result.risk.level, "LOW_EVIDENCE", `status ${statusCode}`);
    assert.ok(result.risk.evidence.some((e) => e.id === "probe-blocked"), `status ${statusCode}`);
    assert.equal(result.timing.ambiguousProbeStatus, true, `status ${statusCode}`);
  }
});

test("youtube.com reachable 200 stays LOW_EVIDENCE", async () => {
  const result = await analyseWebsite("https://youtube.com/", { live: live({ statusCode: 200 }) });
  assert.equal(result.risk.level, "LOW_EVIDENCE");
  assert.equal(result.timing.ambiguousProbeStatus, false);
});

test("youtube.com 429/403/503 does not flip to CAUTION; probe-blocked evidence", async () => {
  for (const statusCode of [403, 429, 503]) {
    const result = await analyseWebsite("https://youtube.com/", { live: live({ statusCode }) });
    assert.equal(result.risk.level, "LOW_EVIDENCE", `status ${statusCode}`);
    const blocked = result.risk.evidence.find((e) => e.id === "probe-blocked");
    assert.ok(blocked, `status ${statusCode} should emit probe-blocked`);
    assert.match(blocked!.detail, new RegExp(String(statusCode)));
    assert.equal(result.timing.ambiguousProbeStatus, true, `status ${statusCode}`);
  }
});

test("404 still escalates to CAUTION (only 403/429/503 exempt)", async () => {
  const result = await analyseWebsite("https://missing.example/", {
    live: live({
      statusCode: 404,
      finalUrl: "https://missing.example/",
      redirectChain: ["https://missing.example/"]
    })
  });
  assert.equal(result.risk.level, "CAUTION");
  assert.ok(result.risk.evidence.some((e) => e.id === "http-status"));
  assert.equal(result.timing.ambiguousProbeStatus, false);
});

test("youtube.com DNS-ok fetch fail does not flip to CAUTION", async () => {
  const result = await analyseWebsite("https://youtube.com/", {
    live: live({
      reachable: false,
      statusCode: null,
      error: "ECONNRESET"
    })
  });
  assert.equal(result.risk.level, "LOW_EVIDENCE");
  assert.ok(result.risk.evidence.some((e) => e.id === "unreachable"));
  assert.equal(result.timing.ambiguousProbeStatus, false);
});