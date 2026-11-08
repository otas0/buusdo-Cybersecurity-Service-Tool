import assert from "node:assert/strict";
import { test } from "node:test";
import { getMessages } from "../i18n/messages";
import {
  ambiguousProbeBlockedCopy,
  probeBlockedPair
} from "../security/probe-blocked-copy";

test("zh-Hans probe-blocked pairs come from message bag (not EN)", () => {
  const zh = getMessages("zh-Hans");
  const en = getMessages("en");
  for (const code of [403, 429, 503] as const) {
    const copy = ambiguousProbeBlockedCopy(code, "zh-Hans");
    const enCopy = ambiguousProbeBlockedCopy(code, "en");
    assert.notEqual(copy.title, enCopy.title);
    assert.notEqual(copy.detail, enCopy.detail);
    assert.match(copy.title, /网站|探测|拒绝|限制|不可用|暂时/);
  }
  assert.ok(zh.probeBlocked403Title);
  assert.notEqual(zh.probeBlocked403Title, en.probeBlocked403Title);

  const pair = probeBlockedPair(
    { id: "probe-blocked", detail: "HTTP 403" },
    { locale: "zh-Hans", liveStatusCode: 403 }
  );
  assert.ok(pair);
  assert.equal(pair[0], zh.probeBlocked403Title);
  assert.notEqual(pair[0], en.probeBlocked403Title);
});
