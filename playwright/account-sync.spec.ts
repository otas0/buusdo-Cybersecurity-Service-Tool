/**
 * Account sync product cancelled — signed-in Settings flow not offered.
 */
import { test } from "@playwright/test";

test.describe("Account sync signed-in flow", () => {
  test("skipped — product cancelled", async () => {
    test.skip(true, "Account sync product cancelled — see docs/ACCOUNT_SYNC_GATE.md");
  });
});
