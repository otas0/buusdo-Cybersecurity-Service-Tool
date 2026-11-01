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
