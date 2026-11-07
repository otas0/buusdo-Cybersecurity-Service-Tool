# Account sync — **cancelled**

Cloud Account sync (magic-link auth, Turso/D1, mailer, list push/pull) is **not shipping**.

## Product state

- `security/account-sync/enabled.ts` → `ACCOUNT_SYNC_PRODUCT_CANCELLED = true`
- `isAccountSyncEnabled()` always returns **false** (env/`wrangler` cannot reopen it)
- Website Settings, extension popup, and desktop dashboard **no longer show** Account UI
- Personal lists stay **on-device**; offline export/import JSON or QR remains

## Workers

- Prod and staging `wrangler.jsonc` keep `ACCOUNT_SYNC_ENABLED: "0"`
- Do **not** put Turso / Resend / Postmark secrets for Account sync
- Do **not** set `ACCOUNT_SYNC_DEV_RETURN_LINK` on any Worker

## CI

- `scripts/assert-staging-health.mjs` — when `STAGING_HEALTH_URL` is set, requires `accountSyncEnabled: false`
- Staging STRICT magic-link / exchange / lists smokes are retired (workflow exits cancelled)
- Playwright Account signed-in hard assert soft-skips

## Re-open later

Only after an explicit product decision: flip `ACCOUNT_SYNC_PRODUCT_CANCELLED`, restore UI, pick a durable store (prefer Cloudflare D1), and rewrite this gate.
