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
}
