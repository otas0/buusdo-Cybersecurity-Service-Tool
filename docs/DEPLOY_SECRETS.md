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
3. Account resources → include the account that owns Worker **`buusdocst`** (and later **`buusdocst-staging`**).
4. Create → copy once → paste into GitHub `CLOUDFLARE_API_TOKEN` (**never** paste the token into chat).

**Status:** Account sync is **cancelled** — do **not** add Turso / Resend / Postmark / magic-link secrets. Deploy still needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` for the website Worker.

```bash
# dash.cloudflare.com/profile/api-tokens → Edit Cloudflare Workers → create → copy once
gh secret set CLOUDFLARE_API_TOKEN --repo otas0/buusdo-Cybersecurity-Service-Tool
gh workflow run "Deploy Cloudflare" --repo otas0/buusdo-Cybersecurity-Service-Tool -f target=production
```

Wrangler OAuth / `wrangler login` cannot be copied into GH secrets — use an API token.

## Recommended variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Deploy build public origin. **Live:** `https://buusdocst.mtsu.workers.dev`. Override when the custom domain is live ([CUSTOM_DOMAIN_REDEPLOY.md](CUSTOM_DOMAIN_REDEPLOY.md) + [POST_LAUNCH_48H.md](POST_LAUNCH_48H.md)). |
| `PRODUCTION_HEALTH_URL` | Same origin for [health-monitor.yml](../.github/workflows/health-monitor.yml). **Live:** `https://buusdocst.mtsu.workers.dev` |
| `STAGING_HEALTH_URL` | Non-prod Worker origin. **Live:** `https://buusdocst-staging.mtsu.workers.dev`. `assert-staging-health` requires `ok: true` and **`accountSyncEnabled: false`**. Must **not** equal `PRODUCTION_HEALTH_URL`. |
| `CHECKLIST_CI_WRITE` | Set to `0` to disable bot commits that append check:prod rows to LAUNCH_CHECKLIST |
| `RUN_PLAYWRIGHT_SETTINGS` | Optional CI job `playwright-settings`. Keep **`false`** until offline Settings narrow (`npm run test:playwright:settings`) is green; only then `gh variable set RUN_PLAYWRIGHT_SETTINGS --body true`. |

## Account sync — cancelled

Cloud Account sync is **not shipping**. See [ACCOUNT_SYNC_GATE.md](ACCOUNT_SYNC_GATE.md).

- Prod + staging `wrangler.jsonc`: `ACCOUNT_SYNC_ENABLED=0` (no `ACCOUNT_SYNC_DEV_RETURN_LINK`)
- Do **not** create Turso / Resend / Postmark / `AUTH_MAGIC_SECRET` / `LISTS_ENC_KEY` for sync
- Optional staging Worker still useful for website preview; health must report `accountSyncEnabled: false`

**Slack:** **skipped** — do not set `SLACK_WEBHOOK_URL`. Health failures use GitHub Actions email / watch ([HEALTH_ALERTS.md](HEALTH_ALERTS.md)). Soft_warn without webhook stays `skipped-no-webhook`.

**Desktop ship = unsigned GitHub Release** (not notarized). Settings + [DESKTOP_SETUP_GUIDE.md](DESKTOP_SETUP_GUIDE.md) tell users Gatekeeper / SmartScreen is expected. Do **not** run `desktop-promote-macos-url` or wait on `NOTARIZED_HEAD_OK`. Fixture `notarized-404` soft-warn is noise for this path. Custom domain independent — [CUSTOM_DOMAIN_REDEPLOY.md](CUSTOM_DOMAIN_REDEPLOY.md). Store URLs empty until approval.

**Pack express / mac zip floor (ops):** `desktop-release` and CI refuse packs without `node_modules/express`. Unsigned mac zip should be ~**58 MB**; assert floor is **55 000 000** bytes (`scripts/assert-desktop-pack-express.mjs`). Override only for deliberate experiments: `SHIELD_PACK_EXPRESS_MIN_ZIP_BYTES` (bytes). Optional local `check:desktop` skip when no pack tree: `SHIELD_PACK_EXPRESS_OPTIONAL=1`. Boot smoke: `npm run smoke:desktop-pack-launcher`.


## Verify

1. Paste `CLOUDFLARE_API_TOKEN` (required; Account ID alone is not enough).
2. Actions → **Deploy Cloudflare** → **Run workflow** → choose `target=production` or `target=staging`.
3. Leave site URL empty to use repo vars, or paste an override.
4. Job must not fail on “Set secrets CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID”.
5. Production: `health:prod` + optional `check:prod` on **ubuntu-latest**. Staging: `assert-staging-health` requires sync **off** when `STAGING_HEALTH_URL` / smoke URL is set.
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