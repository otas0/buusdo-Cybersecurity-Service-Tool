# Ops wrap-up — Cloudflare alerts / Metrics / token

Do these once after website MVP. Not product blockers; needed for 48h watch and CI redeploys.

**Worker product name (dashboard):** set the Workers console description / notes to **buusdo Cybersecurity Service Tool**. Live script name: **`buusdocst`** → `https://buusdocst.mtsu.workers.dev`. Legacy `pcpd` may still exist until deleted.

## 1. `CLOUDFLARE_API_TOKEN` (GitHub Actions Deploy)

1. [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token** → template **Edit Cloudflare Workers**
2. Account = the one that owns Worker **`buusdocst`**
3. Repo `otas0/buusdo-Cybersecurity-Service-Tool` → Settings → Secrets → Actions:

```bash
gh secret set CLOUDFLARE_API_TOKEN --repo otas0/buusdo-Cybersecurity-Service-Tool
# paste token
```

`CLOUDFLARE_ACCOUNT_ID` should already be set. Variable `NEXT_PUBLIC_SITE_URL=https://buusdocst.mtsu.workers.dev`.

Verify: Actions → **Deploy Cloudflare** → Run workflow (production = `buusdocst`).

## 2. Error + CPU alert emails

Follow [CLOUDFLARE_ALERTS.md](CLOUDFLARE_ALERTS.md):

1. Dashboard → Worker **buusdocst** → Notifications (or account Notifications)
2. Enable **Worker errors** + **CPU time** → your operator email
3. Send **test** notification; tick LAUNCH_CHECKLIST only after inbox receives it

## 3. Metrics baseline screenshots

Follow [WORKERS_ERROR_BASELINE.md](WORKERS_ERROR_BASELINE.md):

```
ops/workers-baselines/YYYY-MM-DD-buusdocst-errors.png
ops/workers-baselines/YYYY-MM-DD-buusdocst-cpu.png
ops/workers-baselines/YYYY-MM-DD-buusdocst-NOTES.txt
```

PNGs stay local (gitignored). Update NOTES with Deployments version id.

## Status log

| Item | Status |
|------|--------|
| `CLOUDFLARE_ACCOUNT_ID` (GH) | Set earlier (verify with `gh secret list`) |
| `CLOUDFLARE_API_TOKEN` (GH) | Operator paste required |
| Error/CPU emails | Operator dashboard |
| Metrics PNGs | Operator dashboard |
| China Pages | [CHINA_GITHUB_PAGES.md](CHINA_GITHUB_PAGES.md) |