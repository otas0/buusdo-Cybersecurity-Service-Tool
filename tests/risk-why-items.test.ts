import assert from "node:assert/strict";
import { test } from "node:test";
import { messages } from "../i18n/messages";
import { riskWhyItems, whyEvidenceDisplay } from "../components/risk-why-items";
import { probeBlockedPair } from "../security/probe-blocked-copy";

test("riskWhyItems omits user-block when Halt banner is shown", () => {
  const evidence = [
    { id: "user-block", kind: "known" },
    { id: "known-threat", kind: "known" },
    { id: "https-limit", kind: "limitation" }
  ];
  const withBanner = riskWhyItems(evidence, { bannerShowsUserBlock: true });
  assert.deepEqual(
    withBanner.map((e) => e.id),
    ["known-threat"]
  );
  const withoutBanner = riskWhyItems(evidence, { bannerShowsUserBlock: false });
  assert.deepEqual(
    withoutBanner.map((e) => e.id),
    ["user-block", "known-threat"]
  );
});

test("whyEvidenceDisplay uses probeBlockedPair like detail rows (live + detail fallback)", () => {
  const fromLive = whyEvidenceDisplay(
    { id: "probe-blocked", detail: "generic" },
    { liveStatusCode: 403, locale: "en" }
  );
  const pair403 = probeBlockedPair(
    { id: "probe-blocked", detail: "generic" },
    { liveStatusCode: 403, locale: "en" }
  )!;
  assert.equal(fromLive.title, messages.en.probeBlocked403Title);
  assert.equal(fromLive.title, pair403[0]);
  assert.equal(fromLive.detail, pair403[1]);

  const fromDetail = whyEvidenceDisplay(
    { id: "probe-blocked", detail: "Received HTTP 429 (Too Many Requests)." },
    { liveStatusCode: null, locale: "pt-PT" }
  );
  assert.equal(fromDetail.title, messages["pt-PT"].probeBlocked429Title);
  assert.match(fromDetail.detail, /429/);
});