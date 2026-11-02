/**
 * Staging magic-link smoke — requires ACCOUNT_SYNC + DEV_RETURN_LINK on staging only.
 *
 *   STAGING_HEALTH_URL=https://pcpd-staging….workers.dev npm run smoke:staging-magic-link
 *
 * Refuses production workers.dev. Uses JSON devLink (mail catcher alternative) —
 * never enable ACCOUNT_SYNC_DEV_RETURN_LINK on prod.
 */
import assert from "node:assert/strict";

const staging = String(process.env.STAGING_HEALTH_URL || process.env.STAGING_BASE_URL || "")
  .trim()
  .replace(/\/$/, "");
const prod =
  String(process.env.PRODUCTION_HEALTH_URL || "https://pcpd.mtsu.workers.dev")
    .trim()
    .replace(/\/$/, "") || "https://pcpd.mtsu.workers.dev";

if (!staging) {
  console.log(
    "smoke:staging-magic-link SKIP — set STAGING_HEALTH_URL (gate pending; not a failure)"
  );
  process.exit(0);
}

if (staging === prod) {
  console.error("REFUSE: STAGING_HEALTH_URL must not equal production");
  process.exit(1);
}

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
assert.ok(
  magicBody.devLink,
  "expected devLink — set ACCOUNT_SYNC_DEV_RETURN_LINK=1 on staging env only (wrangler --env staging)"
);

console.log("smoke:staging-magic-link ok");
console.log(`  email=${email}`);
console.log(`  devLink=${String(magicBody.devLink).slice(0, 80)}…`);
console.log("  Next: open device code on desktop Account → Exchange → auto-sync toast");