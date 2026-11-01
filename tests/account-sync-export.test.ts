import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const dir = mkdtempSync(join(tmpdir(), "account-sync-export-"));
process.env.ACCOUNT_SYNC_ENABLED = "1";
process.env.ACCOUNT_SYNC_STORE_PATH = join(dir, "store.json");
process.env.LISTS_ENC_KEY = "test-export-enc";

const { resetAccountStoreForTests } = await import("../security/account-sync/store");
const {
  createMagicChallenge,
  consumeMagicToken,
  exportAccountData,
  deleteAccountForUser
} = await import("../security/account-sync/auth");
const { putUserLists } = await import("../security/account-sync/lists-sync");

test("exportAccountData returns lists + metadata only", () => {
  resetAccountStoreForTests();
  const { token } = createMagicChallenge("export@example.com", "web");
  const consumed = consumeMagicToken(token);
  assert.equal(consumed.ok, true);
  if (!consumed.ok) return;
  const t0 = "2026-10-25T12:00:00.000Z";
  putUserLists(
    consumed.user.id,
    {
      schema: "shield-lists-v1",
      updatedAt: t0,
      blocked: [{ domain: "x.example", reason: "user", createdAt: t0 }],
      trusted: []
    },
    null
  );
  const data = exportAccountData(consumed.user.id);
  assert.ok(data);
  assert.equal(data!.email, "export@example.com");
  assert.equal(data!.userId, consumed.user.id);
  assert.ok(data!.createdAt);
  assert.equal((data!.lists as { blocked: { domain: string }[] }).blocked[0]?.domain, "x.example");
  // no history fields
  assert.ok(!("history" in (data as object)));
  deleteAccountForUser(consumed.user.id);
  assert.equal(exportAccountData(consumed.user.id), null);
});