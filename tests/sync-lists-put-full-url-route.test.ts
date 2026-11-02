import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, before } from "node:test";

const dir = mkdtempSync(join(tmpdir(), "sync-lists-put-route-"));
process.env.ACCOUNT_SYNC_ENABLED = "1";
process.env.ACCOUNT_SYNC_STORE_PATH = join(dir, "store.json");
process.env.LISTS_ENC_KEY = "test-lists-enc-route-key";
process.env.AUTH_MAGIC_SECRET = "test-magic-route";

const { resetAccountStoreForTests } = await import("../security/account-sync/store");
const auth = await import("../security/account-sync/auth");
const { PUT } = await import("../app/api/sync/lists/route");

before(() => {
  resetAccountStoreForTests();
});

test("PUT /api/sync/lists returns 400 backup-full-url-forbidden", async () => {
  resetAccountStoreForTests();
  const { token } = auth.createMagicChallenge("route-url@example.com", "extension");
  const consumed = auth.consumeMagicToken(token);
  assert.equal(consumed.ok, true);
  if (!consumed.ok) return;
  assert.ok(consumed.deviceCode);
  const exchanged = auth.exchangeDeviceCode(consumed.deviceCode!);
  assert.equal(exchanged.ok, true);
  if (!exchanged.ok) return;

  const req = new Request("http://127.0.0.1/api/sync/lists", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${exchanged.accessToken}`
    },
    body: JSON.stringify({
      backup: {
        schema: "shield-lists-v1",
        updatedAt: "2026-11-02T12:00:00.000Z",
        blocked: [{ domain: "https://evil.example/path", reason: "user" }],
        trusted: []
      },
      client: "extension"
    })
  });

  const res = await PUT(req);
  assert.equal(res.status, 400);
  const body = (await res.json()) as { ok: boolean; error?: string };
  assert.equal(body.ok, false);
  assert.equal(body.error, "backup-full-url-forbidden");
});