# Production hosting (Cloudflare Workers)

Primary host: **Cloudflare Workers** via **vinext** (already in this repo: `vite.config.ts` + `@cloudflare/vite-plugin`).  
Do **not** use Vercel for the default launch path.

GitHub Free stays the git + CI home; Cloudflare Free/Workers runs the website.

## Why Cloudflare fits this repo

| Piece | Role |
|-------|------|
| `vinext` + `@cloudflare/vite-plugin` | Dev/build for App Router on Workers (`nodejs_compat`) |
| `npm run deploy:cloudflare` | `vinext build` → assert name `buusdocst` → `wrangler deploy` |
| `npm run deploy:cloudflare:staging` | `CLOUDFLARE_ENV=staging vinext build` → assert name `buusdocst-staging` → `wrangler deploy` (do **not** use `--env` alone) |
| `wrangler.jsonc` | Worker name, compat flags, non-secret vars |
| Custom domain | Cloudflare DNS (or CNAME from external DNS) |

> **CLI note:** Official `@vinext/cloudflare deploy` wants `vinext ^1.4` + `react ^19.3`. This repo currently ships `vinext@1.0.0-beta.3` + React 19.2 — use the `vinext build && wrangler deploy` script above until you intentionally upgrade.

## 0. Free plan reality check

Cloudflare Free / Workers free tier is usually enough for an early launch:

- HTTPS + custom domain
- Workers outbound `fetch` for live probe (`/api/check`)
- `workers.dev` subdomain for first smoke

Limits (CPU time, daily requests) apply — fine for beta; watch dashboard after go-live.

**Account sync cancelled:** do not wire Turso/mailer for lists. See [ACCOUNT_SYNC_GATE.md](ACCOUNT_SYNC_GATE.md) and [OFFLINE_LIST_SYNC.md](OFFLINE_LIST_SYNC.md).

## 1. One-time setup

```bash
# Cloudflare account (free is fine)
npx wrangler login
# or CI: export CLOUDFLARE_API_TOKEN=…  (Edit Cloudflare Workers template)
export CLOUDFLARE_ACCOUNT_ID=…   # from dash.cloudflare.com/<id> or: npx wrangler whoami

npm install   # includes wrangler + @vinext/cloudflare
```

Optional: put `account_id` in `wrangler.jsonc` instead of the env var (do not commit secrets).

## 2. Deploy

```bash
npm run deploy:cloudflare
# = vinext build && wrangler deploy
```

After upgrade to vinext ≥1.4 + React ≥19.3 you may switch to `npx @vinext/cloudflare deploy` (optional).

First success prints a `*.workers.dev` URL. Smoke:

```bash
npm run health:prod -- --url https://buusdocst.mtsu.workers.dev
npm run check:prod -- --url https://buusdocst.mtsu.workers.dev
npm run production:origin -- https://buusdocst.mtsu.workers.dev
```

Expect health: `ok: true`, `threatIntel: "own"`, `curatedListPresent: true`, `accountSyncEnabled: false`.  
Curated hosts are **static-imported** in `security/threat-intel.ts` so they ship inside the Worker bundle (do not rely on `fs` cwd).

## 3. Environment variables & secrets

**Public (build / vars):**

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SITE_URL` | **Yes** after custom domain | `https://your.domain` — no trailing slash |

Set for production builds (shell or CI) before deploy, e.g.:

```bash
export NEXT_PUBLIC_SITE_URL=https://shield.example.com
npm run deploy:cloudflare
```

**Secrets** (never in git) — Cloudflare dashboard → Worker → Settings → Variables, or:

```bash
npx wrangler secret put CHECK_PROBE_TIMEOUT_MS   # optional
# Account sync later only:
# npx wrangler secret put AUTH_MAGIC_SECRET
# npx wrangler secret put LISTS_ENC_KEY
# npx wrangler secret put RESEND_API_KEY
# npx wrangler secret put DATABASE_URL
# npx wrangler secret put DATABASE_AUTH_TOKEN
```

Non-secret defaults can live under `vars` in `wrangler.jsonc` (already sets `ACCOUNT_SYNC_ENABLED=0`).

## 4. Custom domain

1. Add the domain in Cloudflare (use Cloudflare nameservers, or CNAME to workers).
2. Workers → your worker → **Triggers / Custom Domains** → add `shield.example.com`.
3. TLS is automatic on Cloudflare.
4. Set `NEXT_PUBLIC_SITE_URL=https://shield.example.com` and **redeploy**.
5. Confirm:
   ```bash
   npm run health:prod -- --url https://shield.example.com
   ```

Prefer one canonical host (apex **or** `www`), matching `NEXT_PUBLIC_SITE_URL` — see [CANONICAL_HOST.md](CANONICAL_HOST.md).

## 5. Health check & monitoring

| Check | How |
|-------|-----|
| Local | `npm run health:smoke` |
| Production | `npm run health:prod -- --url https://…` |
| Scheduled | GitHub Action [health-monitor.yml](../.github/workflows/health-monitor.yml) — set `PRODUCTION_HEALTH_URL` |

Healthy JSON: `ok`, `service: buusdocst`, `threatIntel: own`, `thirdPartyReputation: false`, `curatedListPresent: true`.

## 6. Post-deploy smoke

```bash
export BASE=https://shield.example.com   # or *.workers.dev
npm run health:prod -- --url "$BASE"
curl -sf "$BASE/en" -o /dev/null
curl -sf "$BASE/pt-PT" -o /dev/null
curl -sf -X POST "$BASE/api/check" \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com"}' | head -c 200
```

## 7. Rollback

Cloudflare dashboard → Workers → Deployments → roll back to the previous version. Keep `NEXT_PUBLIC_SITE_URL` stable across rollbacks.

## 8. CI deploy (optional)

Workflow: [.github/workflows/deploy-cloudflare.yml](../.github/workflows/deploy-cloudflare.yml) (`workflow_dispatch`).  
Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.  
Variable (optional): `NEXT_PUBLIC_SITE_URL`.  
Runs `npm run deploy:cloudflare`, then `health:prod` / `check:prod` when a site URL is set.

## 9. Alerts & freeze

- [CLOUDFLARE_ALERTS.md](CLOUDFLARE_ALERTS.md) — Workers error / CPU email
- [POST_LAUNCH_48H.md](POST_LAUNCH_48H.md) — first 48h watch health + check only
- [VINEXT_UPGRADE_1_4.md](VINEXT_UPGRADE_1_4.md) — evaluate official `@vinext/cloudflare` later

## Related

- [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)
- [ACCOUNT_SYNC_V1.md](ACCOUNT_SYNC_V1.md) — leave off for first Workers launch; Turso required when enabling
- Legacy Vercel notes: `vercel.json` remains for optional Node/`next build` paths only — not the default