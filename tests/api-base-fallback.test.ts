import test from "node:test";
import assert from "node:assert/strict";
import {
  API_BASE_FALLBACK_NOTICE_KEY,
  shouldShowFallbackFromStorage
} from "../extension/shared/api-base-fallback.mjs";

test("shouldShowFallbackFromStorage reads notice key without DOM", () => {
  assert.equal(shouldShowFallbackFromStorage(null), false);
  assert.equal(shouldShowFallbackFromStorage({}), false);
  assert.equal(shouldShowFallbackFromStorage({ [API_BASE_FALLBACK_NOTICE_KEY]: false }), false);
  assert.equal(shouldShowFallbackFromStorage({ [API_BASE_FALLBACK_NOTICE_KEY]: true }), true);
});