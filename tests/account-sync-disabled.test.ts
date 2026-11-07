import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ACCOUNT_SYNC_PRODUCT_CANCELLED,
  isAccountSyncEnabled
} from "../security/account-sync/enabled";

test("Account sync product is cancelled", () => {
  assert.equal(ACCOUNT_SYNC_PRODUCT_CANCELLED, true);
});

test("isAccountSyncEnabled stays false when env unset", () => {
  const prev = process.env.ACCOUNT_SYNC_ENABLED;
  delete process.env.ACCOUNT_SYNC_ENABLED;
  try {
    assert.equal(isAccountSyncEnabled(), false);
  } finally {
    if (prev === undefined) delete process.env.ACCOUNT_SYNC_ENABLED;
    else process.env.ACCOUNT_SYNC_ENABLED = prev;
  }
});

test("isAccountSyncEnabled stays false even when ACCOUNT_SYNC_ENABLED=1", () => {
  const prev = process.env.ACCOUNT_SYNC_ENABLED;
  try {
    process.env.ACCOUNT_SYNC_ENABLED = "1";
    assert.equal(isAccountSyncEnabled(), false);
  } finally {
    if (prev === undefined) delete process.env.ACCOUNT_SYNC_ENABLED;
    else process.env.ACCOUNT_SYNC_ENABLED = prev;
  }
});
