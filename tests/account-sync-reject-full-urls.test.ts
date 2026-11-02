import assert from "node:assert/strict";
import test from "node:test";
import { assertBackupDomainsAreHostsOnly } from "../security/account-sync/reject-full-urls";

test("hosts-only backup accepted", () => {
  assert.doesNotThrow(() =>
    assertBackupDomainsAreHostsOnly({
      schema: "shield-lists-v1",
      blocked: [{ domain: "tracker.example" }],
      trusted: [{ domain: "bank.example" }]
    })
  );
});

test("full URL in blocked rejected", () => {
  assert.throws(
    () =>
      assertBackupDomainsAreHostsOnly({
        blocked: [{ domain: "https://evil.example/path" }]
      }),
    /backup-full-url-forbidden/
  );
});

test("path-like domain rejected", () => {
  assert.throws(
    () => assertBackupDomainsAreHostsOnly({ trusted: [{ domain: "evil.example/login" }] }),
    /backup-full-url-forbidden/
  );
});