# Account sync V1 — personal lists only

Optional busdo account so **block/trust lists** sync across website, extension, and desktop. Local-first; offline export/QR remains.

## Scope

| Syncs | Does not sync |
|-------|----------------|
| `shield-lists-v1` (`blocked[]`, `trusted[]`, `updatedAt`) | Check history, full URLs, diagnostic logs, feedback drafts |
| Optional v2 E2E envelope `shield-lists-e2e-v2` (client passphrase) | Same exclusions |

Gate: `ACCOUNT_SYNC_ENABLED=1`. When off, auth/sync routes return `503` `{ ok:false, error:"account-sync-disabled" }`.  
On Cloudflare Workers, `ACCOUNT_SYNC_REQUIRE_TURSO=1` (wrangler vars) also requires `DATABASE_URL` — sync stays **off** without Turso (never use the file store on Workers).  
`GET /api/health` echoes `accountSyncEnabled`, `accountSyncRequireTurso`, `accountSyncTursoConfigured`.

## Auth (magic link, no passwords)

1. `POST /api/auth/magic/request` `{ email, client?: "web"|"extension"|"desktop" }` → rate-limited by **IP and email hash**; sends magic link via Resend or Postmark. Dev may return `devLink` — **never in `NODE_ENV=production`**.
2. `GET /api/auth/magic/consume?token=` → web: httpOnly session cookie; extension/desktop: `{ deviceCode }` (one-time).
3. `POST /api/auth/device/exchange` `{ deviceCode }` → `{ accessToken, refreshToken, expiresAt }`.
4. `POST /api/auth/refresh` `{ refreshToken }` → rotates Bearer + refresh.
5. `POST /api/auth/logout` — clear cookie / invalidate bearer.
6. `DELETE /api/auth/account` — wipe user + list snapshot (GDPR).
7. `GET /api/auth/account/export` — email + userId + createdAt + lists only (no history).

Signing out does **not** delete cloud lists. Account delete does.

## Sync API

Authenticated via cookie (web) or `Authorization: Bearer <accessToken>`.

- `GET /api/sync/lists` → `{ ok, backup, updatedAt, etag }`
- `PUT /api/sync/lists` body `{ backup, client, deviceId?, baseUpdatedAt?, mode? }`  
  - `mode`: `merge` (default) | `replace-cloud` | `replace-device`
  - If `baseUpdatedAt` mismatches server → merge; response may include `conflict: true`
  - Over entry/byte cap → **413** `lists-too-many-entries` / `lists-too-large`

Payload must parse as `shield-lists-v1` or opaque `shield-lists-e2e-v2` ([`shared/lists-e2e-crypto.mjs`](../shared/lists-e2e-crypto.mjs)). Server at-rest encryption: `LISTS_ENC_KEY`.

## Store backends

| Condition | Backend |
|-----------|---------|
| Local / tests, `DATABASE_URL` unset, Turso **not** required | File `data/account-sync/store.json` |
| `DATABASE_URL` = libsql/Turso (+ optional `DATABASE_AUTH_TOKEN`) | Same JSON document in SQL (`@libsql/client` optional dep) |
| Workers: `ACCOUNT_SYNC_REQUIRE_TURSO=1` and no Turso | Sync **disabled** (`isAccountSyncEnabled()` false); no file writes |

## Privacy

- Opt-in: Never store / This device only / Diagnostics unchanged.
- Sync requires signed-in + explicit Sync lists toggle on the client.
- Website never enforces DNR/proxy; lists sync for restore/orchestration only.
- Support blob may include `accountSignedIn: boolean` (never email).

## Clients

| Surface | Token storage | UI |
|---------|---------------|-----|
| Website Settings `#settings-account` | httpOnly cookie | Sign in / Sync / conflict chips / Export / Sign out / Delete |
| Extension popup | `chrome.storage.local` when privacy ≠ off | Sign in / Sync now; auto-pull debounce after Website API scan |
| Desktop dashboard | `desktop-app/data/account-tokens.json` (gitignored) | Account panel; watch-push last-error on status |

Offline backup (export/QR/Syncthing) stays labeled **Offline backup**.