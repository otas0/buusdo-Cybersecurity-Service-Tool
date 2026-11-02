import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { shouldFocusAskDecline, hashFocusOnlyScrolls } = require("../desktop-app/src/machine-focus.js");
const { quitGraceMs } = require("../desktop-app/src/quit-grace.js");

test("hash focus does not re-focus ask when the modal is already open", () => {
  assert.equal(shouldFocusAskDecline({ askVisible: true, alreadyOpen: false }), true);
  assert.equal(shouldFocusAskDecline({ askVisible: true, alreadyOpen: true }), false);
  assert.equal(shouldFocusAskDecline({ askVisible: false, alreadyOpen: false }), false);
  assert.equal(hashFocusOnlyScrolls({ askVisible: true, alreadyOpen: false }), true);
  assert.equal(hashFocusOnlyScrolls({ askVisible: false, alreadyOpen: true }), true);
  assert.equal(hashFocusOnlyScrolls({ askVisible: false, alreadyOpen: false }), false);
});

test("SHIELD_QUIT_GRACE_MS is clamped and defaults to 200", () => {
  const prev = process.env.SHIELD_QUIT_GRACE_MS;
  try {
    delete process.env.SHIELD_QUIT_GRACE_MS;
    assert.equal(quitGraceMs(), 200);
    process.env.SHIELD_QUIT_GRACE_MS = "350";
    assert.equal(quitGraceMs(), 350);
    process.env.SHIELD_QUIT_GRACE_MS = "-1";
    assert.equal(quitGraceMs(), 200);
    process.env.SHIELD_QUIT_GRACE_MS = "99999";
    assert.equal(quitGraceMs(), 10_000);
  } finally {
    if (prev == null) delete process.env.SHIELD_QUIT_GRACE_MS;
    else process.env.SHIELD_QUIT_GRACE_MS = prev;
  }
});