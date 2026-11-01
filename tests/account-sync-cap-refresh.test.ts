import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, before } from "node:test";

const dir = mkdtempSync(join(tmpdir(), "account-sync-cap-"));
process.env.ACCOUNT_SYNC_ENABLED = "1";
process.env.ACCOUNT_SYNC_STORE_PATH = join(dir, "store.json");
process.env.LISTS_ENC_KEY = "test-lists-enc-cap";
process.env.ACCOUNT_SYNC_MAX_ENTRIES = "3";
process.env.ACCOUNT_SYNC_MAX_BYTES = "500";

const { resetAccountStoreForTests, upsertUser, withStore } = await import(
  "../security/account-sync/store"
);
const { putUserLists } = await import("../security/account-sync/lists-sync");
const { refreshAccessToken, exchangeDeviceCode, createMagicChallenge, consumeMagicToken } =
  await import("../security/account-sync/auth");
const { assertListsWithinCap, capErrorFromUnknown } = await import(
  "../security/account-sync/lists-cap"
);
const { encryptListsE2E, decryptListsE2E, isE2EEnvelope } = await import(
  "../shared/lists-e2e-crypto.mjs"
);

before(() => {
  resetAccountStoreForTests();
});

test("assertListsWithinCap throws lists-too-many-entries", () => {
  assert.throws(
    () =>
      assertListsWithinCap({
        blocked: [
          { domain: "a.example" },
          { domain: "b.example" },
          { domain: "c.example" },
          { domain: "d.example" }
        ],
        trusted: []
      }),
    (err: unknown) => {
      const cap = capErrorFromUnknown(err);
      return cap?.code === "lists-too-many-entries";
    }
  );
});

test("putUserLists returns 413-shaped error for over-cap", () => {
  resetAccountStoreForTests();
  const user = withStore((store) => upsertUser(store, "cap@example.com"));
  const backup = {
    schema: "shield-lists-v1",
    updatedAt: new Date().toISOString(),
    blocked: [
      { domain: "a.example", reason: "user", createdAt: new Date().toISOString() },
      { domain: "b.example", reason: "user", createdAt: new Date().toISOString() },
      { domain: "c.example", reason: "user", createdAt: new Date().toISOString() },
      { domain: "d.example", reason: "user", createdAt: new Date().toISOString() }
    ],
    trusted: []
  };
  assert.throws(() => putUserLists(user.id, backup, null), (err: unknown) => {
    return capErrorFromUnknown(err)?.code === "lists-too-many-entries";
  });
});

test("refreshAccessToken rotates tokens", () => {
  resetAccountStoreForTests();
  const { token } = createMagicChallenge("refresh@example.com", "extension");
  const consumed = consumeMagicToken(token);
  assert.equal(consumed.ok, true);
  if (!consumed.ok) return;
  const exchanged = exchangeDeviceCode(consumed.deviceCode!);
  assert.equal(exchanged.ok, true);
  if (!exchanged.ok) return;
  const refreshed = refreshAccessToken(exchanged.refreshToken);
  assert.equal(refreshed.ok, true);
  if (!refreshed.ok) return;
  assert.ok(refreshed.accessToken);
  assert.notEqual(refreshed.accessToken, exchanged.accessToken);
  // old refresh invalid
  assert.equal(refreshAccessToken(exchanged.refreshToken).ok, false);
});

test("e2e encrypt/decrypt round-trip", async () => {
  const backup = {
    schema: "shield-lists-v1",
    updatedAt: "2026-10-25T12:00:00.000Z",
    blocked: [{ domain: "secret.example", reason: "user", createdAt: "2026-10-25T12:00:00.000Z" }],
    trusted: []
  };
  const envelope = await encryptListsE2E(backup, "passphrase-ok");
  assert.equal(isE2EEnvelope(envelope), true);
  const plain = await decryptListsE2E(envelope, "passphrase-ok");
  assert.equal(plain.blocked[0].domain, "secret.example");
});

test("replace-device overwrites without merge", () => {
  resetAccountStoreForTests();
  process.env.ACCOUNT_SYNC_MAX_ENTRIES = "100";
  const user = withStore((store) => upsertUser(store, "mode@example.com"));
  const t0 = "2026-10-25T10:00:00.000Z";
  putUserLists(
    user.id,
    {
      schema: "shield-lists-v1",
      updatedAt: t0,
      blocked: [{ domain: "old.example", reason: "user", createdAt: t0 }],
      trusted: []
    },
    null
  );
  const t1 = "2026-10-25T11:00:00.000Z";
  const next = putUserLists(
    user.id,
    {
      schema: "shield-lists-v1",
      updatedAt: t1,
      blocked: [{ domain: "new.example", reason: "user", createdAt: t1 }],
      trusted: []
    },
    "stale",
    "replace-device"
  );
  assert.equal(next.merged, false);
  const domains = (next.backup as { blocked: { domain: string }[] }).blocked.map((e) => e.domain);
  assert.deepEqual(domains, ["new.example"]);
});