import assert from "node:assert/strict";
import test from "node:test";
import { getMessages } from "../i18n/messages";
import { formatHaltTimingChip, timingLabels } from "../components/timing-copy";

test("Halt timing chip aria-label is bilingual via timingLabels", () => {
  const en = formatHaltTimingChip(42, timingLabels(getMessages("en")));
  const pt = formatHaltTimingChip(42, timingLabels(getMessages("pt-PT")));
  assert.equal(en.text, "check 42ms");
  assert.match(en.ariaLabel, /Total:\s*42ms/i);
  assert.equal(pt.text, "verificação 42ms");
  assert.match(pt.ariaLabel, /Total:\s*42ms/i);
  assert.notEqual(en.text, pt.text);
});
