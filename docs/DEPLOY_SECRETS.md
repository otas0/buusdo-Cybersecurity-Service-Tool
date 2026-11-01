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
| `CHECKLIST_CI_WRITE` | Set to `0` to disable bot commits that append check:prod rows to LAUNCH_CHECKLIST |


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
