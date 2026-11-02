/**
 * Account token shape merge smoke — desktop JSON ↔ extension storage keys.
 * Live Exchange + shared Bearer waits for ACCOUNT_SYNC gate (Turso + mailer).
 *
 *   npm run smoke:account-token-merge
 */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(".");
const require = createRequire(import.meta.url);
const dir = mkdtempSync(path.join(tmpdir(), "shield-token-merge-"));
const tokensFile = path.join(dir, "account-tokens.json");

process.env.ACCOUNT_TOKENS_PATH = tokensFile;

const accountTokens = require(path.join(root, "desktop-app/src/account-tokens.js"));
const ext = await import(pathToFileURL(path.join(root, "extension/shared/account-sync.mjs")).href);

const sample = {
  accessToken: "access-merge-smoke",
  refreshToken: "refresh-merge-smoke",
  email: "merge-smoke@example.com",
  syncEnabled: true
};

accountTokens.writeTokens(sample);
const desktop = accountTokens.readTokens();
assert.equal(desktop.accessToken, sample.accessToken);
assert.equal(desktop.refreshToken, sample.refreshToken);
assert.equal(desktop.email, sample.email);
assert.equal(desktop.syncEnabled, true);

/** In-memory chrome.storage.local stand-in */
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
    syncEnabled: desktop.syncEnabled
  },
  storage
);
const fromExt = await ext.readAccountTokens(storage);
assert.equal(fromExt.accessToken, desktop.accessToken);
assert.equal(fromExt.refreshToken, desktop.refreshToken);
assert.equal(fromExt.email, desktop.email);
assert.equal(fromExt.syncEnabled, desktop.syncEnabled);

assert.equal(ext.ACCOUNT_ACCESS_KEY, "shieldAccountAccessToken");
assert.ok(Object.keys(bag).includes(ext.ACCOUNT_ACCESS_KEY));

// Round-trip: extension → desktop file (same Bearer fields).
accountTokens.writeTokens({
  accessToken: fromExt.accessToken,
  refreshToken: fromExt.refreshToken,
  email: fromExt.email,
  syncEnabled: fromExt.syncEnabled
});
const again = JSON.parse(readFileSync(tokensFile, "utf8"));
assert.equal(again.accessToken, sample.accessToken);

rmSync(dir, { recursive: true, force: true });
console.log("smoke:account-token-merge ok (shape aligned; live Exchange after ACCOUNT_SYNC gate)");