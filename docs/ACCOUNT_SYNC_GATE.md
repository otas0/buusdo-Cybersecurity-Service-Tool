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
3. `GET /api/health` → `accountSyncEnabled: true`, `accountSyncTursoConfigured: true`. CI job **staging-account-sync** asserts `accountSyncEnabled: true` **only** against `STAGING_HEALTH_URL`.
4. `STAGING_HEALTH_URL=… npm run smoke:staging-magic-link` (JSON `devLink` — staging only) → desktop device code → Exchange → auto-sync toast (`data-testid=account-auto-sync-toast`). Use `STRICT_STAGING=1` when the gate must hard-fail SKIP (unset URL / sync off / no `devLink`). Bidirectional lists: `smoke:account-lists-bidirectional`. Real desktop toast+blockHost: `npm run smoke:desktop-auto-sync-toast`.
5. Website dangerous result → **Block on desktop** → local list write + proxy guide (desktop must already be running on `:3010`).
6. Extension: same Account token after Exchange → auto-sync + fail toast (same lists schema; domain hosts only — **never full URLs**). Optional: `npm run smoke:account-exchange-e2e`.
7. Paste the green staging Actions run URL into [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) § D, then flip production.