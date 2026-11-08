import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { getMessages } from "../i18n/messages";

test("fr pack Privacy/Settings bodies are French (not EN fallback)", () => {
  const frPack = JSON.parse(
    readFileSync(path.join("i18n/packs/fr.json"), "utf8")
  ) as Record<string, string>;
  const en = getMessages("en");
  const fr = getMessages("fr");

  assert.ok(frPack.privacyPolicyIntro?.includes("confidentialité") || /gamme Buusdo|aide à vérifier/.test(frPack.privacyPolicyIntro));
  assert.notEqual(fr.privacyPolicyIntro, en.privacyPolicyIntro);
  assert.notEqual(fr.privacyPolicyWhatBody, en.privacyPolicyWhatBody);
  assert.notEqual(fr.privacyPolicyStoreBody, en.privacyPolicyStoreBody);
  assert.notEqual(fr.settingsIntro, en.settingsIntro);
  assert.match(fr.privacyPolicyLimitsBody, /TLS|MITM|AV/);
  assert.match(fr.desktopDownloadsIntro, /GitHub|installer|non sign/i);
});
