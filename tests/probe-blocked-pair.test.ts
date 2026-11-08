import assert from "node:assert/strict";
import { test } from "node:test";
import { getMessages, messages } from "../i18n/messages";
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

test("generic probe-blocked {status} for fr and de comes from message bag", () => {
  const fr = ambiguousProbeBlockedCopy(418, "fr");
  const de = ambiguousProbeBlockedCopy(418, "de");
  assert.match(fr.detail, /418/);
  assert.match(de.detail, /418/);
  assert.match(fr.title, /site|sonde|bloqu/i);
  assert.match(de.title, /Seite|Sonde|block/i);
  assert.notEqual(fr.title, messages.en.probeBlockedGenericTitle);
  assert.notEqual(de.title, messages.en.probeBlockedGenericTitle);
  const frPair = probeBlockedPair(
    { id: "probe-blocked", detail: "HTTP 418" },
    { locale: "fr" }
  );
  assert.ok(frPair);
  assert.match(frPair![1], /418/);
});

test("generic probe-blocked {status} for ja/es/it comes from message bag", () => {
  for (const locale of ["ja", "es", "it"] as const) {
    const bag = getMessages(locale);
    const copy = ambiguousProbeBlockedCopy(418, locale);
    assert.match(copy.detail, /418/);
    assert.ok(bag.probeBlockedGenericDetail.includes("{status}"));
    assert.equal(copy.title, bag.probeBlockedGenericTitle);
    assert.notEqual(copy.title, messages.en.probeBlockedGenericTitle);
    const pair = probeBlockedPair(
      { id: "probe-blocked", detail: "Received HTTP 418." },
      { locale, liveStatusCode: 418 }
    );
    assert.ok(pair, locale);
    assert.equal(pair![0], bag.probeBlockedGenericTitle);
    assert.match(pair![1], /418/);
  }
});

test("probeBlockedPair multi-locale titles/details stay bag-backed", () => {
  for (const locale of ["de", "th", "mi", "ja", "zh-Hans", "pt-PT"] as const) {
    const bag = getMessages(locale);
    for (const code of [403, 429, 503] as const) {
      const pair = probeBlockedPair(
        { id: "probe-blocked", detail: `Received HTTP ${code}.` },
        { locale, liveStatusCode: code }
      );
      assert.ok(pair, `${locale}/${code}`);
      const titleKey = `probeBlocked${code}Title` as const;
      const detailKey = `probeBlocked${code}Detail` as const;
      assert.equal(pair![0], bag[titleKey]);
      assert.equal(pair![1], bag[detailKey]);
      assert.notEqual(pair![0].trim(), "");
      assert.match(pair![1], new RegExp(String(code)));
    }
    const generic = probeBlockedPair(
      { id: "probe-blocked", detail: "Received HTTP 418." },
      { locale, liveStatusCode: 418 }
    );
    assert.ok(generic);
    assert.match(generic![1], /418/);
    assert.equal(generic![0], bag.probeBlockedGenericTitle);
  }
});