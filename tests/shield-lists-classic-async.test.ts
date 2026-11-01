import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);

test("classic expandQrOrBackupAsync rejects bad ZB1: with invalid-backup", async () => {
  require("../shared/shield-lists.classic.js");
  const classic = (
    globalThis as {
      ShieldLists?: {
        expandQrOrBackupAsync: (raw: unknown) => Promise<unknown>;
      };
    }
  ).ShieldLists;
  assert.ok(classic?.expandQrOrBackupAsync);

  await assert.rejects(
    () => classic!.expandQrOrBackupAsync("ZB1:not-valid-base64!!!"),
    (err: unknown) => err instanceof Error && err.message === "invalid-backup"
  );
});