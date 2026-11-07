/**
 * Account sync product cancelled — toast fixture retired.
 * Generic toast coverage lives with desktop UI smokes if needed later.
 */
import { test } from "@playwright/test";

test("account-auto-sync-toast skipped — product cancelled", async () => {
  test.skip(true, "Account sync cancelled — see docs/ACCOUNT_SYNC_GATE.md");
});
