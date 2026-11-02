# Account sync gate (Turso + mailer) — do not open early

Public Workers launch keeps **`ACCOUNT_SYNC_ENABLED=0`**.

## Why

Workers have no durable local disk. File store under `data/account-sync/` is for local/tests only.  
`ACCOUNT_SYNC_REQUIRE_TURSO=1` on Workers means sync stays **off** without `DATABASE_URL`.

## Open the gate only when all of these are ready

| Piece | Requirement |
|-------|-------------|
| Turso / libsql | `DATABASE_URL` + `DATABASE_AUTH_TOKEN` as Wrangler secrets |
| `@libsql/client` | Installed for the deploy that turns sync on |
| Mailer | Resend (`RESEND_API_KEY`) **or** Postmark + `AUTH_FROM_EMAIL` |
| Auth secret | `AUTH_MAGIC_SECRET`, `LISTS_ENC_KEY` |
| Product | Privacy pages + launch freeze complete; not during first 48h incident window |

## Flip sequence

1. Create Turso DB; put secrets via `wrangler secret put …`.
2. Confirm `GET /api/health` → `accountSyncTursoConfigured: true` while sync still **off**.
3. Set `ACCOUNT_SYNC_ENABLED=1` (wrangler `vars` or secret) and redeploy.
4. Health → `accountSyncEnabled: true`.
5. Smoke magic-link on web + extension device exchange (staging email).
6. Only then mention Account in public docs.

## Explicit non-goals before gate

- Do not enable sync “just to try” on workers.dev
- Do not use file store on Workers
- Do not ship `ACCOUNT_SYNC_DEV_RETURN_LINK` in production

## Staging smoke (before prod flip)

1. Deploy staging via `wrangler.jsonc` **`env.staging`** (`pcpd-staging`) with Turso + mailer secrets — never copy `ACCOUNT_SYNC_ENABLED=1` / `ACCOUNT_SYNC_DEV_RETURN_LINK=1` onto top-level prod vars ([DEPLOY_SECRETS.md](DEPLOY_SECRETS.md)).
2. Set GitHub Actions variable `STAGING_HEALTH_URL` to that origin (must **not** equal `PRODUCTION_HEALTH_URL` / workers.dev prod). When unset, CI summary says **gate pending** (not a silent skip).
3. `GET /api/health` → `accountSyncEnabled: true`, `accountSyncTursoConfigured: true`. CI job **staging-account-sync** (`scripts/assert-staging-health.mjs`) **fail-closes** when `STAGING_HEALTH_URL` is set but either flag is false (only against that staging URL — never prod).
4. Ordered STRICT smokes (after magic-link green, Exchange → toast):
   ```bash
   STRICT_STAGING=1 STAGING_HEALTH_URL="$STAGING_HEALTH_URL" npm run smoke:staging-magic-link
   STRICT_STAGING=1 STAGING_HEALTH_URL="$STAGING_HEALTH_URL" npm run smoke:account-exchange-e2e
   STRICT_STAGING=1 STAGING_HEALTH_URL="$STAGING_HEALTH_URL" npm run smoke:account-lists-bidirectional
   npm run smoke:desktop-auto-sync-toast   # toast + blockHost on local desktop :3010
   ```
5. Extension unpacked on real Chrome: after Exchange works, load `extension/` → same Account token → confirm `data-testid=account-auto-sync-toast` (popup already wired in `extension/popup/popup.js`). Prod wrangler must keep `ACCOUNT_SYNC_DEV_RETURN_LINK` off top-level — `npm run assert:wrangler-prod-no-dev-return`.
6. Website dangerous result → **Block on desktop** → local list write + proxy guide (desktop must already be running on `:3010`).
7. Extension lists schema: domain hosts only — **never full URLs**.
8. Paste the green staging Actions run URL into [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) § D, then flip production.

## Scheduled STRICT smokes (Actions)

Workflow [.github/workflows/staging-strict-smokes.yml](../.github/workflows/staging-strict-smokes.yml) (**Staging STRICT smokes**): cron every 6h + `workflow_dispatch`. Unset `STAGING_HEALTH_URL` → soft **gate pending** (exit 0). When set → `assert-staging-health` (Turso fail-closed) then `STRICT_STAGING=1` magic-link + exchange + lists. Desktop toast + Chrome unpacked remain manual after green. Health monitor staging job summary links here for the ordered command block.