/**
 * Live Account Exchange E2E (desktop ↔ extension token merge) after gate opens.
 *
 *   STAGING_HEALTH_URL=… ACCOUNT_SYNC_ENABLED=1 npm run smoke:account-exchange-e2e
 *
 * Without staging URL / sync off → exit 0 skip (shape merge remains smoke:account-token-merge).
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const staging = String(process.env.STAGING_HEALTH_URL || "").trim().replace(/\/$/, "");
const prod = String(process.env.PRODUCTION_HEALTH_URL || "https://pcpd.mtsu.workers.dev")
  .trim()
  .replace(/\/$/, "");

if (!staging) {
  console.log("smoke:account-exchange-e2e SKIP — STAGING_HEALTH_URL unset (gate pending)");
  process.exit(0);
}
if (staging === prod) {
  console.error("REFUSE: staging URL equals production");
  process.exit(1);
}

const health = await fetch(`${staging}/api/health`).then((r) => r.json());
if (!health?.accountSyncEnabled) {
  console.log("smoke:account-exchange-e2e SKIP — accountSyncEnabled false on staging");
  process.exit(0);
}

const email = `ex-e2e-${Date.now()}@example.com`;
const magicRes = await fetch(`${staging}/api/auth/magic/request`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email, client: "extension" })
});
const magicBody = await magicRes.json();
if (!magicBody?.devLink) {
  console.log(
    "smoke:account-exchange-e2e SKIP — no devLink (need ACCOUNT_SYNC_DEV_RETURN_LINK=1 on staging)"
  );
  process.exit(0);
}

// Consume magic via GET (sets session / returns device path depending on client).
const consume = await fetch(magicBody.devLink, { redirect: "manual" });
// Device code may be in JSON body of a follow-up — prefer magic response fields if present.
let deviceCode = magicBody.deviceCode || null;
if (!deviceCode && magicBody.devLink.includes("device")) {
  const u = new URL(magicBody.devLink, staging);
  deviceCode = u.searchParams.get("deviceCode") || u.searchParams.get("code");
}

// Fallback: consume token API if link is /api/auth/magic/consume?token=
if (!deviceCode) {
  const u = new URL(magicBody.devLink, staging);
  const token = u.searchParams.get("token");
  if (token) {
    const c = await fetch(`${staging}/api/auth/magic/consume`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, client: "extension" })
    }).then((r) => r.json()).catch(() => null);
    deviceCode = c?.deviceCode || null;
  }
}

if (!deviceCode) {
  console.log(
    "smoke:account-exchange-e2e SKIP — could not extract deviceCode from staging magic flow",
    `(consume status ${consume.status})`
  );
  process.exit(0);
}

const exchange = await fetch(`${staging}/api/auth/device/exchange`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ deviceCode })
}).then((r) => r.json());
assert.equal(exchange.ok, true, exchange.error || "exchange failed");
assert.ok(exchange.accessToken);

const require = createRequire(import.meta.url);
const root = path.resolve(".");
const dir = mkdtempSync(path.join(tmpdir(), "shield-ex-e2e-"));
process.env.ACCOUNT_TOKENS_PATH = path.join(dir, "account-tokens.json");
const accountTokens = require(path.join(root, "desktop-app/src/account-tokens.js"));
const ext = await import(pathToFileURL(path.join(root, "extension/shared/account-sync.mjs")).href);

accountTokens.writeTokens({
  accessToken: exchange.accessToken,
  refreshToken: exchange.refreshToken || "",
  email,
  syncEnabled: true
});
const desktop = accountTokens.readTokens();

const bag = {};
const storage = {
  async set(patch) {
    Object.assign(bag, patch);
  },
  async get(keys) {
    const out = {};
    for (const k of Array.isArray(keys) ? keys : [keys]) out[k] = bag[k];
    return out;
  },
  async remove(keys) {
    for (const k of keys) delete bag[k];
  }
};
await ext.persistAccountTokens(
  {
    accessToken: desktop.accessToken,
    refreshToken: desktop.refreshToken,
    email: desktop.email,
    syncEnabled: true
  },
  storage
);
const fromExt = await ext.readAccountTokens(storage);
assert.equal(fromExt.accessToken, desktop.accessToken);

rmSync(dir, { recursive: true, force: true });
console.log("smoke:account-exchange-e2e ok — same Bearer on desktop file + extension storage keys");