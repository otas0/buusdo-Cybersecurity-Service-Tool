# GitHub Actions secrets for Cloudflare deploy

Workflow: [.github/workflows/deploy-cloudflare.yml](../.github/workflows/deploy-cloudflare.yml) (`workflow_dispatch`).

## Required secrets

| Secret | Where | Value |
|--------|--------|--------|
| `CLOUDFLARE_API_TOKEN` | Repo → Settings → Secrets and variables → Actions → **Secrets** | Token with Workers edit |
| `CLOUDFLARE_ACCOUNT_ID` | Same → **Secrets** | `dash.cloudflare.com/<id>` (also printed by `npx wrangler whoami`) |

### Create the API token

1. [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token**.
2. Use template **Edit Cloudflare Workers**, or custom:
   - Account → Workers Scripts → Edit
   - Account → Account Settings → Read (often needed)
3. Account resources → include the account that owns Worker **`pcpd`**.
4. Create → copy once → paste into GitHub `CLOUDFLARE_API_TOKEN`.

**Status (2026-11-02):** `CLOUDFLARE_ACCOUNT_ID` is set on `otas0/preventive-cybersecurity-prototype`. **`CLOUDFLARE_API_TOKEN` is still missing** — Deploy Cloudflare (prod + staging) cannot run from Actions until you paste a dashboard token:

```bash
# dash.cloudflare.com/profile/api-tokens → Edit Cloudflare Workers → create → copy once
gh secret set CLOUDFLARE_API_TOKEN --repo otas0/preventive-cybersecurity-prototype
# paste token, then:
gh workflow run "Deploy Cloudflare" --repo otas0/preventive-cybersecurity-prototype -f target=staging
# or -f target=production
```

Wrangler OAuth / `wrangler login` cannot be copied into GH secrets — use an API token.

## Recommended variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Deploy build public origin. **If unset**, Deploy workflow defaults to `https://pcpd.mtsu.workers.dev`. Override when the custom domain is live (**custom domain hold** until Account gate + [POST_LAUNCH_48H.md](POST_LAUNCH_48H.md)). |
| `PRODUCTION_HEALTH_URL` | Same origin for [health-monitor.yml](../.github/workflows/health-monitor.yml) (also defaults to workers.dev if unset) |
| `STAGING_HEALTH_URL` | **Non-prod** Worker origin for Account-sync gate. Must **not** equal `PRODUCTION_HEALTH_URL`. When set, job `staging-account-sync` **fail-closes** unless `accountSyncEnabled` **and** `accountSyncTursoConfigured` are both `true` (`scripts/assert-staging-health.mjs`). Unset → summary **gate pending** (exit 0). |
| `CHECKLIST_CI_WRITE` | Set to `0` to disable bot commits that append check:prod rows to LAUNCH_CHECKLIST |
| `RUN_PLAYWRIGHT_SETTINGS` | Optional CI job `playwright-settings`. Keep **`false`** until offline Settings narrow (`npm run test:playwright:settings`) is green; only then `gh variable set RUN_PLAYWRIGHT_SETTINGS --body true`. |

## Staging Account sync (Turso + mailer) — before prod flip

Do **not** enable sync on production workers.dev. Use a separate staging Worker / preview. Gate checklist: [ACCOUNT_SYNC_GATE.md](ACCOUNT_SYNC_GATE.md). Record the green Actions run in [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) § D.

### Wrangler vars (staging Worker)

| Var | Value |
|-----|--------|
| `ACCOUNT_SYNC_ENABLED` | `1` |
| `ACCOUNT_SYNC_REQUIRE_TURSO` | `1` (keep; never file store on Workers) |

Use the **staging** env in `wrangler.jsonc` (Worker name `pcpd-staging`, `ACCOUNT_SYNC_ENABLED=1`, `ACCOUNT_SYNC_DEV_RETURN_LINK=1`). Never copy those vars onto the top-level (prod) block.

```bash
# Deploy staging (after vinext/wrangler build — same pipeline as prod, different --env)
# npx wrangler deploy --env staging

npx wrangler secret put DATABASE_URL --env staging
npx wrangler secret put DATABASE_AUTH_TOKEN --env staging
npx wrangler secret put AUTH_MAGIC_SECRET --env staging
npx wrangler secret put LISTS_ENC_KEY --env staging
npx wrangler secret put AUTH_FROM_EMAIL --env staging
# Mailer — pick one:
npx wrangler secret put RESEND_API_KEY --env staging
# OR
# npx wrangler secret put POSTMARK_SERVER_TOKEN --env staging

# Smoke (devLink JSON — staging only):
# STAGING_HEALTH_URL=https://pcpd-staging.<subdomain>.workers.dev npm run smoke:staging-magic-link
# STRICT_STAGING=1 …  → hard-fail SKIP (unset URL / no Turso / no DEV_RETURN)
```

**STRICT_STAGING=1:** `smoke:staging-magic-link`, `smoke:account-exchange-e2e`, and `smoke:account-lists-bidirectional` exit **1** on SKIP (missing `STAGING_HEALTH_URL`, sync off, or no `devLink`). Default (unset) stays soft SKIP exit 0 so `check:desktop` stays green before the gate opens.

| Secret | Purpose |
|--------|---------|
| `DATABASE_URL` | Turso / libsql URL |
| `DATABASE_AUTH_TOKEN` | Turso auth token (if required by URL) |
| `AUTH_MAGIC_SECRET` | Magic-link HMAC / signing |
| `LISTS_ENC_KEY` | Encrypt list backups at rest |
| `AUTH_FROM_EMAIL` | From address for magic links |
| `RESEND_API_KEY` **or** `POSTMARK_SERVER_TOKEN` | Mailer |

After deploy (Actions: **Deploy Cloudflare** → `target=staging`, or local `npm run deploy:cloudflare:staging`):

1. Copy the exact workers.dev URL from the deploy log (form `https://pcpd-staging.<subdomain>.workers.dev`) — **no placeholders**.
2. Paste that exact URL into this doc under **Staging URL (live)** below, then:
   ```bash
   gh variable set STAGING_HEALTH_URL --repo otas0/preventive-cybersecurity-prototype -b 'https://pcpd-staging.<exact-subdomain>.workers.dev'
   ```
3. Actions → **Health monitor** or **Production health smoke** → job **staging health (account sync on)** green (`accountSyncEnabled` + `accountSyncTursoConfigured`).
4. Paste the run URL into LAUNCH_CHECKLIST § D.
5. STRICT + Exchange + toast sequence ([ACCOUNT_SYNC_GATE.md](ACCOUNT_SYNC_GATE.md)).

### Staging URL (live)

_Pending first `pcpd-staging` deploy._ Replace this line with the exact origin (no `<subdomain>` placeholders):

`STAGING_HEALTH_URL=` _(unset — set after deploy)_

**Prod remains** `ACCOUNT_SYNC_ENABLED=0` until that checklist is complete.

**This workstation (2026-11-02):** `pcpd-staging` does not exist yet; Turso CLI / Resend keys absent; cannot `wrangler secret put` without your credentials. Repo Actions secrets still only `CLOUDFLARE_ACCOUNT_ID` (no API token / Slack / Turso). Leave LAUNCH_CHECKLIST § D `_pending_` until you run the secret puts + deploy above, then:

```bash
# After deploy prints the exact URL — substitute it here (must ≠ PRODUCTION_HEALTH_URL):
export STAGING_HEALTH_URL='https://pcpd-staging.<exact-subdomain>.workers.dev'
gh variable set STAGING_HEALTH_URL --repo otas0/preventive-cybersecurity-prototype -b "$STAGING_HEALTH_URL"
STRICT_STAGING=1 STAGING_HEALTH_URL="$STAGING_HEALTH_URL" npm run smoke:staging-magic-link
STRICT_STAGING=1 STAGING_HEALTH_URL="$STAGING_HEALTH_URL" npm run smoke:account-exchange-e2e
STRICT_STAGING=1 STAGING_HEALTH_URL="$STAGING_HEALTH_URL" npm run smoke:account-lists-bidirectional
# Local desktop toast+blockHost (uses staging token from exchange when configured):
npm run smoke:desktop-auto-sync-toast
gh workflow run "Health monitor" --repo otas0/preventive-cybersecurity-prototype
```

**Slack soft_warn:** set `SLACK_WEBHOOK_URL` ([HEALTH_ALERTS.md](HEALTH_ALERTS.md)); drill rate-limit: first `force_soft_slack=true` → `rateLimited=false`; second dispatch within 1h (without force, same soft_warn) → summary `rateLimited=true`.

**Notarized promote:** `desktop-promote-macos-url` refuses unless notarized asset HEAD is **200** and verify prints `NOTARIZED_HEAD_OK=1`. After that: live Settings `PLAYWRIGHT_BASE_URL=https://pcpd.mtsu.workers.dev npm run test:playwright:settings-mac-ready-to-promote-live`. Keep `RUN_PLAYWRIGHT_SETTINGS=false` until offline Settings narrow is green.


## Verify

1. Paste `CLOUDFLARE_API_TOKEN` (required; Account ID alone is not enough).
2. Actions → **Deploy Cloudflare** → **Run workflow** → choose `target=production` or `target=staging`.
3. Leave site URL empty to use repo vars, or paste an override.
4. Job must not fail on “Set secrets CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID”.
5. Production: `health:prod` + optional `check:prod` on **ubuntu-latest**. Staging: `assert-staging-health` (Turso fail-closed) when `STAGING_HEALTH_URL` / smoke URL is set.
6. Laptop CF timeout → trust Actions only ([LOCAL_CF_CONNECTIVITY.md](LOCAL_CF_CONNECTIVITY.md)).

## After first CI deploy

If the public URL changed, run locally and commit:

```bash
npm run production:origin -- https://YOUR_ORIGIN
```

## Desktop Windows Authenticode (optional)

Used by [.github/workflows/desktop-release.yml](../.github/workflows/desktop-release.yml) when publishing the NSIS installer to the same GitHub Release as macOS/Linux.

| Secret / env | Purpose |
|--------------|---------|
| `WIN_CERT_PFX_BASE64` | Base64-encoded `.pfx` / `.p12` code-signing certificate |
| `WIN_CERT_PFX_PASSWORD` | Password for that PFX |
| `WIN_CERT_REQUIRE` | Set to `1` on the release job (env) or as a **repo variable** to **refuse** uploading / skipping verify when the PFX secret is missing |

When `WIN_CERT_PFX_BASE64` is unset and `WIN_CERT_REQUIRE` is not `1`, the workflow still uploads `PreventiveShield-Setup-User.exe` unsigned and prints a notice. CI `desktop-windows` (`.github/workflows/ci.yml`) honors the same repo var `WIN_CERT_REQUIRE=1`: if the PFX secret is missing, the job **fails** instead of skipping `signtool verify`. Release (`desktop-release.yml`) refuses an unsigned upload under the same flag.

**Production recommendation:** once the org Authenticode PFX is installed as `WIN_CERT_PFX_BASE64` / `WIN_CERT_PFX_PASSWORD`, set the repo variable **`WIN_CERT_REQUIRE=1`** so both release uploads and CI `desktop-windows` cannot silently skip signing.