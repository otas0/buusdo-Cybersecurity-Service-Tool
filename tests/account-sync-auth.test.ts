import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, before, after } from "node:test";

const dir = mkdtempSync(join(tmpdir(), "account-sync-auth-"));
process.env.ACCOUNT_SYNC_ENABLED = "1";
process.env.ACCOUNT_SYNC_STORE_PATH = join(dir, "store.json");
process.env.LISTS_ENC_KEY = "test-lists-enc-key";
process.env.AUTH_MAGIC_SECRET = "test-magic-secret";

const auth = await import("../security/account-sync/auth");
const { resetAccountStoreForTests } = await import("../security/account-sync/store");
const { isAccountSyncEnabled } = await import("../security/account-sync/enabled");

before(() => {
  resetAccountStoreForTests();
});

after(() => {
  resetAccountStoreForTests();
});

test("ACCOUNT_SYNC product cancelled — gate stays off", () => {
  assert.equal(isAccountSyncEnabled(), false);
});

test("magic link create + consume web sets session", () => {
  resetAccountStoreForTests();
  const { token } = auth.createMagicChallenge("User@Example.com", "web");
  const result = auth.consumeMagicToken(token);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.user.email, "user@example.com");
  assert.equal(result.client, "web");
  assert.ok(result.sessionToken);
  const session = auth.resolveSession(result.sessionToken);
  assert.ok(session);
  assert.equal(session!.user.email, "user@example.com");
});

test("extension magic → device code → exchange", () => {
  resetAccountStoreForTests();
  const { token } = auth.createMagicChallenge("ext@example.com", "extension");
  const consumed = auth.consumeMagicToken(token);
  assert.equal(consumed.ok, true);
  if (!consumed.ok) return;
  assert.ok(consumed.deviceCode);
  const exchanged = auth.exchangeDeviceCode(consumed.deviceCode!);
  assert.equal(exchanged.ok, true);
  if (!exchanged.ok) return;
  assert.ok(exchanged.accessToken);
  const session = auth.resolveSession(exchanged.accessToken);
  assert.ok(session);
  assert.equal(session!.user.email, "ext@example.com");
  // one-time
  const again = auth.exchangeDeviceCode(consumed.deviceCode!);
  assert.equal(again.ok, false);
});

test("delete account wipes user", () => {
  resetAccountStoreForTests();
  const { token } = auth.createMagicChallenge("gone@example.com", "web");
  const consumed = auth.consumeMagicToken(token);
  assert.equal(consumed.ok, true);
  if (!consumed.ok) return;
  auth.deleteAccountForUser(consumed.user.id);
  assert.equal(auth.resolveSession(consumed.sessionToken), null);
});