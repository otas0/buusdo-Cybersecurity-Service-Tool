import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { getMessages } from "../i18n/messages";

for (const id of ["nb", "fi"] as const) {
  test(`${id} pack Privacy/Settings bodies are localized (not EN fallback)`, () => {
    const pack = JSON.parse(readFileSync(path.join("i18n/packs", `${id}.json`), "utf8")) as Record<
      string,
      string
    >;
    const en = getMessages("en");
    const bag = getMessages(id);
    assert.notEqual(bag.privacyPolicyIntro, en.privacyPolicyIntro);
    assert.notEqual(bag.settingsIntro, en.settingsIntro);
    assert.ok(pack.privacyPolicyWhatBody?.trim());
    assert.ok(pack.privacyPolicyLimitsBody?.trim());
    assert.ok(pack.probeBlockedGenericDetail?.includes("{status}"));
  });

  test(`${id} Halt/Clear/Hold readout strings are localized`, () => {
    const en = getMessages("en");
    const bag = getMessages(id);
    assert.notEqual(bag.lightSafe, en.lightSafe, `${id}.lightSafe`);
    assert.notEqual(bag.lightCaution, en.lightCaution, `${id}.lightCaution`);
    assert.notEqual(bag.lightDanger, en.lightDanger, `${id}.lightDanger`);
    assert.notEqual(bag.lightStandby, en.lightStandby, `${id}.lightStandby`);
    assert.ok(bag.lightIdle && bag.lightIdle !== en.lightIdle, `${id}.lightIdle`);
    assert.ok(bag.ignoreRiskBody && bag.ignoreRiskBody !== en.ignoreRiskBody, `${id}.ignoreRiskBody`);
  });

  test(`${id} probe-blocked 403/429/503 titles are localized`, () => {
    const pack = JSON.parse(readFileSync(path.join("i18n/packs", `${id}.json`), "utf8")) as Record<
      string,
      string
    >;
    const en = getMessages("en");
    const bag = getMessages(id);
    for (const key of [
      "probeBlocked403Title",
      "probeBlocked403Detail",
      "probeBlocked429Title",
      "probeBlocked429Detail",
      "probeBlocked503Title",
      "probeBlocked503Detail"
    ] as const) {
      assert.ok(pack[key]?.trim(), `${id}.${key}`);
      assert.notEqual(bag[key], en[key], `${id}.${key} still EN`);
    }
  });

  test(`${id} ambiguousProbe + evidenceProbeTimeout are localized`, () => {
    const pack = JSON.parse(readFileSync(path.join("i18n/packs", `${id}.json`), "utf8")) as Record<
      string,
      string
    >;
    const en = getMessages("en");
    const bag = getMessages(id);
    assert.ok(pack.ambiguousProbeNotPhishing?.trim());
    assert.ok(pack.evidenceProbeTimeoutTitle?.trim());
    assert.ok(pack.evidenceProbeTimeoutDetail?.trim());
    assert.notEqual(bag.ambiguousProbeNotPhishing, en.ambiguousProbeNotPhishing);
    assert.notEqual(bag.evidenceProbeTimeoutTitle, en.evidenceProbeTimeoutTitle);
    assert.notEqual(bag.evidenceProbeTimeoutDetail, en.evidenceProbeTimeoutDetail);
    assert.equal(pack.timingAmbiguousProbe, en.timingAmbiguousProbe);
  });
}

for (const id of ["nb", "fi"] as const) {
  test(`${id} historyFilterProbeBlocked* are localized`, () => {
    const pack = JSON.parse(readFileSync(path.join("i18n/packs", `${id}.json`), "utf8")) as Record<
      string,
      string
    >;
    const en = getMessages("en");
    const bag = getMessages(id);
    assert.ok(pack.historyFilterProbeBlocked?.trim(), `${id}.historyFilterProbeBlocked`);
    assert.ok(pack.historyFilterProbeBlockedEmpty?.trim(), `${id}.historyFilterProbeBlockedEmpty`);
    assert.notEqual(bag.historyFilterProbeBlocked, en.historyFilterProbeBlocked, `${id}.historyFilterProbeBlocked still EN`);
    assert.notEqual(
      bag.historyFilterProbeBlockedEmpty,
      en.historyFilterProbeBlockedEmpty,
      `${id}.historyFilterProbeBlockedEmpty still EN`
    );
  });
}
