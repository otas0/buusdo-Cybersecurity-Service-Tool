/**
 * Staging magic-link smoke — requires ACCOUNT_SYNC + DEV_RETURN_LINK on staging only.
 *
 *   STAGING_HEALTH_URL=https://buusdocst-staging….workers.dev npm run smoke:staging-magic-link
 *   STRICT_STAGING=1 …  # fail instead of SKIP when unset / incomplete
 */
import assert from "node:assert/strict";
import { stagingSoftSkip, stagingUrlOrExit } from "./lib/strict-staging.mjs";

const { staging } = stagingUrlOrExit("smoke:staging-magic-link");

const health = await fetch(`${staging}/api/health`).then((r) => r.json());
assert.equal(health.ok, true, "staging health ok");
assert.equal(health.accountSyncEnabled, true, "staging accountSyncEnabled must be true");

const email = `staging-smoke-${Date.now()}@example.com`;
const magic = await fetch(`${staging}/api/auth/magic/request`, {
  method: "POST",
  headers: { "content-type": "application/json", accept: "application/json" },
  body: JSON.stringify({ email, client: "desktop" })
});
const magicBody = await magic.json();
assert.equal(magic.ok, true, `magic HTTP ${magic.status}`);
assert.equal(magicBody.ok, true, magicBody.error || "magic not ok");
if (!magicBody.devLink) {
  stagingSoftSkip(
    "smoke:staging-magic-link",
    "no devLink (need ACCOUNT_SYNC_DEV_RETURN_LINK=1 on staging env only)"
  );
}

console.log("smoke:staging-magic-link ok");
console.log(`  email=${email}`);
console.log(`  devLink=${String(magicBody.devLink).slice(0, 80)}…`);
console.log("  Next: open device code on desktop Account → Exchange → auto-sync toast");