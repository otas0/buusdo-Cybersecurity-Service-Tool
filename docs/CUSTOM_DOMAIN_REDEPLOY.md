# Custom domain + second deploy (`NEXT_PUBLIC_SITE_URL`)

First launch can stay on `https://pcpd.mtsu.workers.dev`.  
When you attach a real domain, do a **second** deploy so the client bundle knows the public origin.

## 1. Attach the domain

1. Cloudflare DNS for the zone (orange-cloud or CNAME to workers as required).
2. Workers → **preventive-shield** → **Triggers / Custom Domains** → add the host.
3. Wait for TLS active.

## 2. Pick one canonical host

Apex **or** `www` — not both as equals. See [CANONICAL_HOST.md](CANONICAL_HOST.md).  
301 the other host → canonical.

## 3. Update GitHub variables (same commit cycle)

| Variable | Set to |
|----------|--------|
| `NEXT_PUBLIC_SITE_URL` | `https://YOUR_CANONICAL` (no trailing slash) |
| `PRODUCTION_HEALTH_URL` | **same** canonical origin |

## 4. Redeploy with public URL

```bash
export CLOUDFLARE_ACCOUNT_ID=…   # or use CI secrets
export NEXT_PUBLIC_SITE_URL=https://YOUR_CANONICAL
npm run deploy:cloudflare
```

Or Actions → **Deploy Cloudflare** (input / variable `NEXT_PUBLIC_SITE_URL`).  
Privacy Playwright runs after deploy when `run_privacy_smoke` is true.

## 5. Retarget clients + public copy

```bash
npm run production:origin -- https://YOUR_CANONICAL
# updates README, production-site.json, extension DEFAULT_API_BASE + host_permissions,
# and rewrites docs/PUBLIC_PROMOTION.md tables
npm run health:prod -- --url https://YOUR_CANONICAL
npm run check:prod -- --url https://YOUR_CANONICAL
```

Commit those files. Confirm [PUBLIC_PROMOTION.md](PUBLIC_PROMOTION.md) shows **only** the new canonical + `/en/privacy` (and optional pt-PT).

## 6. Checklist

Mark the custom-domain rows in [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) § B.  
Ops overview: [OPS_RUNBOOK.md](OPS_RUNBOOK.md).
