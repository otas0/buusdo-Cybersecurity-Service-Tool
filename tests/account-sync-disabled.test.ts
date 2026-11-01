import assert from "node:assert/strict";
import { test } from "node:test";
import { isAccountSyncEnabled } from "../security/account-sync/enabled";

test("ACCOUNT_SYNC_ENABLED defaults off (unset is not enabled)", () => {
  const prev = process.env.ACCOUNT_SYNC_ENABLED;
  delete process.env.ACCOUNT_SYNC_ENABLED;
  try {
    assert.equal(isAccountSyncEnabled(), false);
  } finally {
    if (prev === undefined) delete process.env.ACCOUNT_SYNC_ENABLED;
    else process.env.ACCOUNT_SYNC_ENABLED = prev;
  }
});

test("ACCOUNT_SYNC_ENABLED only exact 1 enables", () => {
  const prev = process.env.ACCOUNT_SYNC_ENABLED;
  try {
    process.env.ACCOUNT_SYNC_ENABLED = "true";
    assert.equal(isAccountSyncEnabled(), false);
    process.env.ACCOUNT_SYNC_ENABLED = "1";
    assert.equal(isAccountSyncEnabled(), true);
  } finally {
    if (prev === undefined) delete process.env.ACCOUNT_SYNC_ENABLED;
    else process.env.ACCOUNT_SYNC_ENABLED = prev;
  }
});