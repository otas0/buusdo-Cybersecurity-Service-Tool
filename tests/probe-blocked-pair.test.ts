import assert from "node:assert/strict";
import { test } from "node:test";
import { messages } from "../i18n/messages";
import {
  ambiguousProbeBlockedCopy,
  probeBlockedPair,
  resolveProbeBlockedStatusCode
} from "../security/probe-blocked-copy";

test("probeBlockedPair picks 403/429/503 from live.statusCode", () => {
  for (const code of [403, 429, 503] as const) {
    const pair = probeBlockedPair(
      { id: "probe-blocked", detail: "generic" },
      { liveStatusCode: code, locale: "en" }
    );
    assert.ok(pair);
    assert.equal(pair![0], messages.en[`probeBlocked${code}Title` as keyof typeof messages.en]);
    assert.match(pair![1], new RegExp(String(code)));
  }
});

test("probeBlockedPair falls back to HTTP NNN in detail when live.statusCode absent", () => {
  const pair429 = probeBlockedPair(
    { id: "probe-blocked", detail: "Received HTTP 429 (Too Many Requests)." },
    { liveStatusCode: null, locale: "en" }
  );
  assert.ok(pair429);
  assert.equal(pair429![0], messages.en.probeBlocked429Title);
  assert.match(pair429![1], /429/);

  const pair403 = probeBlockedPair(
    { id: "probe-blocked", detail: "Received HTTP 403 (Forbidden)." },
    { locale: "pt-PT" }
  );
  assert.ok(pair403);
  assert.equal(pair403![0], messages["pt-PT"].probeBlocked403Title);
});

test("resolveProbeBlockedStatusCode prefers live over detail", () => {
  assert.equal(resolveProbeBlockedStatusCode("Received HTTP 429.", 403), 403);
  assert.equal(resolveProbeBlockedStatusCode("Received HTTP 503.", null), 503);
  assert.equal(resolveProbeBlockedStatusCode("no status", null), null);
});

test("ambiguousProbeBlockedCopy EN keys match messages (site-signals single source)", () => {
  assert.deepEqual(ambiguousProbeBlockedCopy(403), {
    title: messages.en.probeBlocked403Title,
    detail: messages.en.probeBlocked403Detail
  });
  assert.deepEqual(ambiguousProbeBlockedCopy(429, "en"), {
    title: messages.en.probeBlocked429Title,
    detail: messages.en.probeBlocked429Detail
  });
  assert.equal(ambiguousProbeBlockedCopy(503, "pt-PT").title, messages["pt-PT"].probeBlocked503Title);
});

test("probeBlockedPair ignores non-probe-blocked ids", () => {
  assert.equal(
    probeBlockedPair({ id: "http-status", detail: "Received HTTP 404." }, { locale: "en" }),
    undefined
  );
});

test("ambiguousProbeBlockedCopy uses locale bag for ja/de and generic {status}", () => {
  const ja = ambiguousProbeBlockedCopy(403, "ja");
  assert.match(ja.title, /サイト|拒否|自動/);
  const de = ambiguousProbeBlockedCopy(429, "de");
  assert.ok(de.title.trim());
  const other = ambiguousProbeBlockedCopy(418, "zh-Hans");
  assert.match(other.detail, /418/);
});