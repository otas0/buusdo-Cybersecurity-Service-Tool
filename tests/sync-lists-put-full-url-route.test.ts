import assert from "node:assert/strict";
import { test } from "node:test";

process.env.ACCOUNT_SYNC_ENABLED = "1";

const { PUT } = await import("../app/api/sync/lists/route");

test("PUT /api/sync/lists stays 410 while Account sync product is cancelled", async () => {
  const req = new Request("http://127.0.0.1/api/sync/lists", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer unused"
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
  assert.equal(res.status, 410);
  const body = (await res.json()) as { ok: boolean; error?: string };
  assert.equal(body.ok, false);
  assert.equal(body.error, "account-sync-cancelled");
});
