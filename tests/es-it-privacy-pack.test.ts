import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { getMessages } from "../i18n/messages";

for (const id of ["es", "it"] as const) {
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
}
