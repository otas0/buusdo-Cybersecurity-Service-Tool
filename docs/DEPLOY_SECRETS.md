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

**Status (2026-11-01):** `CLOUDFLARE_ACCOUNT_ID` is set on `otas0/preventive-cybersecurity-prototype`. `CLOUDFLARE_API_TOKEN` still needs a dashboard-created token pasted into Actions secrets (Wrangler OAuth cannot be copied into GH).

## Recommended variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Deploy build public origin. **If unset**, Deploy workflow defaults to `https://pcpd.mtsu.workers.dev`. Override when the custom domain is live. |
| `PRODUCTION_HEALTH_URL` | Same origin for [health-monitor.yml](../.github/workflows/health-monitor.yml) (also defaults to workers.dev if unset) |
| `STAGING_HEALTH_URL` | **Non-prod** Worker origin for Account-sync gate smoke. Must **not** equal `PRODUCTION_HEALTH_URL`. When set, Production health runs job `staging-account-sync` and asserts `accountSyncEnabled: true` **only** on this URL. |
| `CHECKLIST_CI_WRITE` | Set to `0` to disable bot commits that append check:prod rows to LAUNCH_CHECKLIST |

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

After deploy:

1. Set GitHub Actions variable `STAGING_HEALTH_URL=https://YOUR-STAGING.workers.dev` (≠ prod).
2. Actions → **Production health** → confirm job **staging-account-sync** is green (`accountSyncEnabled: true`).
3. Paste the run URL into LAUNCH_CHECKLIST § D.
4. Desktop + extension device-exchange smoke ([ACCOUNT_SYNC_GATE.md](ACCOUNT_SYNC_GATE.md)).
5. Optional: `STAGING_HEALTH_URL=… npm run smoke:account-lists-bidirectional` (desktop PUT host → GET; full-URL PUT → 400).

**Prod remains** `ACCOUNT_SYNC_ENABLED=0` until that checklist is complete.

**This workstation (2026-11-02):** `pcpd-staging` does not exist yet; Turso CLI / Resend keys absent; cannot `wrangler secret put` without your credentials. Leave LAUNCH_CHECKLIST § D `_pending_` until you run the secret puts + deploy above, then:

```bash
gh variable set STAGING_HEALTH_URL --repo otas0/preventive-cybersecurity-prototype -b 'https://pcpd-staging.YOUR_SUBDOMAIN.workers.dev'
# must differ from PRODUCTION_HEALTH_URL=https://pcpd.mtsu.workers.dev
STRICT_STAGING=1 STAGING_HEALTH_URL="$STAGING_HEALTH_URL" npm run smoke:staging-magic-link
STRICT_STAGING=1 STAGING_HEALTH_URL="$STAGING_HEALTH_URL" npm run smoke:account-lists-bidirectional
gh workflow run "Health monitor" --repo otas0/preventive-cybersecurity-prototype
```

**Slack soft_warn:** set `SLACK_WEBHOOK_URL` ([HEALTH_ALERTS.md](HEALTH_ALERTS.md)); drill with `-f force_soft_slack=true`. Confirmed path builds RELEASE steps 2-3 hint when notarized HEAD is 404 — delivery needs the secret.

**Notarized promote:** hold `desktop-promote-macos-url` until `NOTARIZED_HEAD_OK=1`. After HEAD 200, verify live Settings `settings-desktop-mac-ready-to-promote` with `PLAYWRIGHT_BASE_URL=… npm run test:playwright:settings-mac-ready-to-promote-live`.


## Verify

1. Actions → **Deploy Cloudflare** → **Run workflow**.
2. Leave site URL empty to use `NEXT_PUBLIC_SITE_URL`, or paste an override.
3. Job must not fail on “Set secrets CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID”.
4. When URL is set, job runs `health:prod` + optional `check:prod` on **ubuntu-latest** (usually CF-reachable).

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