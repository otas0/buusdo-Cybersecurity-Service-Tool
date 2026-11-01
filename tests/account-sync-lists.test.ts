import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, before } from "node:test";

const dir = mkdtempSync(join(tmpdir(), "account-sync-lists-"));
process.env.ACCOUNT_SYNC_ENABLED = "1";
process.env.ACCOUNT_SYNC_STORE_PATH = join(dir, "store.json");
process.env.LISTS_ENC_KEY = "test-lists-enc-key-2";

const { resetAccountStoreForTests, upsertUser, withStore } = await import(
  "../security/account-sync/store"
);
const { getUserLists, putUserLists, parseShieldListsOrThrow } = await import(
  "../security/account-sync/lists-sync"
);

before(() => {
  resetAccountStoreForTests();
});

function sample(domain: string, updatedAt: string) {
  return {
    schema: "shield-lists-v1",
    updatedAt,
    blocked: [{ domain, reason: "user", createdAt: updatedAt }],
    trusted: [] as { domain: string; createdAt: string }[]
  };
}

test("parseShieldListsOrThrow rejects non-v1", () => {
  assert.throws(() => parseShieldListsOrThrow({ schema: "nope", blocked: [], trusted: [] }));
});

test("put + get round-trip encrypts at rest", () => {
  resetAccountStoreForTests();
  const user = withStore((store) => upsertUser(store, "lists@example.com"));
  const t0 = "2026-10-25T10:00:00.000Z";
  const put = putUserLists(user.id, sample("bad.example", t0), null);
  const putBackup = put.backup as { blocked: { domain?: string }[] };
  assert.equal(putBackup.blocked[0]?.domain, "bad.example");
  assert.equal(put.merged, false);
  const got = getUserLists(user.id);
  assert.ok(got.backup);
  assert.equal((got.backup as { blocked: { domain: string }[] }).blocked[0]?.domain, "bad.example");
});

test("diverged baseUpdatedAt merges domain union", () => {
  resetAccountStoreForTests();
  const user = withStore((store) => upsertUser(store, "merge@example.com"));
  const t0 = "2026-10-25T10:00:00.000Z";
  const t1 = "2026-10-25T11:00:00.000Z";
  putUserLists(user.id, sample("a.example", t0), null);
  const second = putUserLists(user.id, sample("b.example", t1), "stale-base");
  assert.equal(second.merged, true);
  const secondBackup = second.backup as { blocked: { domain: string }[] };
  const domains = secondBackup.blocked.map((e) => e.domain).sort();
  assert.deepEqual(domains, ["a.example", "b.example"]);
});