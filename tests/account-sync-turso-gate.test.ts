import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

const env = process.env as {
  ACCOUNT_SYNC_ENABLED?: string;
  ACCOUNT_SYNC_REQUIRE_TURSO?: string;
  DATABASE_URL?: string;
};

const prevEnabled = env.ACCOUNT_SYNC_ENABLED;
const prevRequire = env.ACCOUNT_SYNC_REQUIRE_TURSO;
const prevDb = env.DATABASE_URL;

afterEach(() => {
  if (prevEnabled === undefined) delete env.ACCOUNT_SYNC_ENABLED;
  else env.ACCOUNT_SYNC_ENABLED = prevEnabled;
  if (prevRequire === undefined) delete env.ACCOUNT_SYNC_REQUIRE_TURSO;
  else env.ACCOUNT_SYNC_REQUIRE_TURSO = prevRequire;
  if (prevDb === undefined) delete env.DATABASE_URL;
  else env.DATABASE_URL = prevDb;
});

describe("account sync Turso gate", () => {
  it("stays off when REQUIRE_TURSO=1 without DATABASE_URL", async () => {
    env.ACCOUNT_SYNC_ENABLED = "1";
    env.ACCOUNT_SYNC_REQUIRE_TURSO = "1";
    delete env.DATABASE_URL;
    const { isAccountSyncEnabled, isAccountSyncRequireTurso } = await import(
      "../security/account-sync/enabled"
    );
    assert.equal(isAccountSyncRequireTurso(), true);
    assert.equal(isAccountSyncEnabled(), false);
  });

  it("opens when REQUIRE_TURSO=1 and DATABASE_URL is set", async () => {
    env.ACCOUNT_SYNC_ENABLED = "1";
    env.ACCOUNT_SYNC_REQUIRE_TURSO = "1";
    env.DATABASE_URL = "libsql://example.turso.io";
    const { isAccountSyncEnabled } = await import("../security/account-sync/enabled");
    assert.equal(isAccountSyncEnabled(), true);
  });

  it("allows file-store path when REQUIRE_TURSO unset", async () => {
    env.ACCOUNT_SYNC_ENABLED = "1";
    delete env.ACCOUNT_SYNC_REQUIRE_TURSO;
    delete env.DATABASE_URL;
    const { isAccountSyncEnabled } = await import("../security/account-sync/enabled");
    assert.equal(isAccountSyncEnabled(), true);
  });
});