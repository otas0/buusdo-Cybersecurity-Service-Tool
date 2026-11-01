import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldReturnDevLink } from "../security/account-sync/mail";

test("shouldReturnDevLink is false in production", () => {
  const env = process.env as { NODE_ENV?: string; ACCOUNT_SYNC_DEV_RETURN_LINK?: string };
  const prevNode = env.NODE_ENV;
  const prevDev = env.ACCOUNT_SYNC_DEV_RETURN_LINK;
  try {
    env.NODE_ENV = "production";
    env.ACCOUNT_SYNC_DEV_RETURN_LINK = "1";
    assert.equal(shouldReturnDevLink(), false);
  } finally {
    env.NODE_ENV = prevNode;
    if (prevDev === undefined) delete env.ACCOUNT_SYNC_DEV_RETURN_LINK;
    else env.ACCOUNT_SYNC_DEV_RETURN_LINK = prevDev;
  }
});

test("shouldReturnDevLink defaults on outside production", () => {
  const env = process.env as { NODE_ENV?: string; ACCOUNT_SYNC_DEV_RETURN_LINK?: string };
  const prevNode = env.NODE_ENV;
  const prevDev = env.ACCOUNT_SYNC_DEV_RETURN_LINK;
  try {
    env.NODE_ENV = "development";
    delete env.ACCOUNT_SYNC_DEV_RETURN_LINK;
    assert.equal(shouldReturnDevLink(), true);
    env.ACCOUNT_SYNC_DEV_RETURN_LINK = "0";
    assert.equal(shouldReturnDevLink(), false);
  } finally {
    env.NODE_ENV = prevNode;
    if (prevDev === undefined) delete env.ACCOUNT_SYNC_DEV_RETURN_LINK;
    else env.ACCOUNT_SYNC_DEV_RETURN_LINK = prevDev;
  }
});