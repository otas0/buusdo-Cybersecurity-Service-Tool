/**
 * After Account gate opens: block a host on "desktop" backup, PUT, then GET must
 * show the same host for extension client (domain union only).
 *
 *   STAGING_HEALTH_URL=… npm run smoke:account-lists-bidirectional
 *
 * Without staging → exit 0 skip (gate pending).
 */
import assert from "node:assert/strict";
import { stagingSoftSkip, stagingUrlOrExit } from "./lib/strict-staging.mjs";

const { staging } = stagingUrlOrExit("smoke:account-lists-bidirectional");

const health = await fetch(`${staging}/api/health`).then((r) => r.json());
if (!health?.accountSyncEnabled) {
  stagingSoftSkip("smoke:account-lists-bidirectional", "accountSyncEnabled false");
}

const email = `lists-bi-${Date.now()}@example.com`;
const host = `bi-${Date.now()}.example`;
const magic = await fetch(`${staging}/api/auth/magic/request`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email, client: "extension" })
}).then((r) => r.json());

if (!magic?.devLink) {
  stagingSoftSkip(
    "smoke:account-lists-bidirectional",
    "no devLink (need ACCOUNT_SYNC_DEV_RETURN_LINK=1 on staging)"
  );
}

const u = new URL(magic.devLink, staging);
const token = u.searchParams.get("token");
let deviceCode = magic.deviceCode || null;
if (token) {
  const consumed = await fetch(`${staging}/api/auth/magic/consume`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, client: "extension" })
  }).then((r) => r.json()).catch(() => null);
  deviceCode = consumed?.deviceCode || deviceCode;
}
if (!deviceCode) {
  console.log("smoke:account-lists-bidirectional SKIP — no deviceCode");
  process.exit(0);
}

const exchanged = await fetch(`${staging}/api/auth/device/exchange`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ deviceCode })
}).then((r) => r.json());
assert.equal(exchanged.ok, true, exchanged.error || "exchange");
const access = exchanged.accessToken;
assert.ok(access);

const now = new Date().toISOString();
const backup = {
  schema: "shield-lists-v1",
  updatedAt: now,
  blocked: [{ domain: host, reason: "desktop-smoke", createdAt: now }],
  trusted: []
};

const put = await fetch(`${staging}/api/sync/lists`, {
  method: "PUT",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${access}`
  },
  body: JSON.stringify({ backup, client: "desktop" })
}).then(async (r) => ({ status: r.status, body: await r.json() }));
assert.equal(put.status, 200, JSON.stringify(put.body));
assert.equal(put.body.ok, true);

const get = await fetch(`${staging}/api/sync/lists`, {
  headers: { authorization: `Bearer ${access}` }
}).then((r) => r.json());
assert.equal(get.ok, true);
const domains = (get.backup?.blocked || []).map((e) => e.domain);
assert.ok(domains.includes(host), `expected ${host} in blocked after desktop PUT; got ${domains}`);

// Reject full URL (defense in depth on live staging).
const bad = await fetch(`${staging}/api/sync/lists`, {
  method: "PUT",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${access}`
  },
  body: JSON.stringify({
    backup: {
      schema: "shield-lists-v1",
      updatedAt: new Date().toISOString(),
      blocked: [{ domain: "https://evil.example/x", reason: "x" }],
      trusted: []
    },
    client: "extension"
  })
}).then(async (r) => ({ status: r.status, body: await r.json() }));
assert.equal(bad.status, 400);
assert.equal(bad.body.error, "backup-full-url-forbidden");

console.log(`smoke:account-lists-bidirectional ok — host ${host} round-tripped desktop→GET`);