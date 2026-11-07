# Custom domain + second deploy (`NEXT_PUBLIC_SITE_URL`)

First launch can stay on `https://buusdocst.mtsu.workers.dev`.  
When you attach a real domain, do a **second** deploy so the client bundle knows the public origin.

**Hold note:** Custom domain is **not** blocked on Account sync (cancelled). Canonical stay on `https://buusdocst.mtsu.workers.dev` until you pick a host. Then: DNS → Worker custom domain → set `NEXT_PUBLIC_SITE_URL` + `PRODUCTION_HEALTH_URL` → redeploy → `npm run production:origin` → [POST_LAUNCH_48H.md](POST_LAUNCH_48H.md).

## 1. Attach the domain

1. Cloudflare DNS for the zone (orange-cloud or CNAME to workers as required).
2. Workers → **buusdocst** → **Triggers / Custom Domains** → add the host.
3. Wait for TLS active.

## 2. Pick one canonical host

Apex **or** `www` — not both as equals. See [CANONICAL_HOST.md](CANONICAL_HOST.md).  
301 the other host → canonical.

## 3. Update GitHub variables (same commit cycle)

| Variable | Set to |
|----------|--------|
| `NEXT_PUBLIC_SITE_URL` | `https://YOUR_CANONICAL` (no trailing slash) |
| `PRODUCTION_HEALTH_URL` | **same** canonical origin |

After setting (or after `production:origin`), verify both Actions variables match the origin:

```bash
npm run production:origin -- https://YOUR_CANONICAL --check-github-vars
# or vars-only against shared/production-site.json:
npm run production:origin -- --check-github-vars
```

Requires authenticated `gh`. Mismatch exits 1 — fix Settings → Variables before the second deploy.

**Hold:** do not cut over the custom domain until [POST_LAUNCH_48H.md](POST_LAUNCH_48H.md) hygiene is ready (freeze ended 2026-11-03; still prefer green health + CF alerts before DNS cutover). Custom domain is independent of Account sync (cancelled).

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
npm run production:origin -- https://YOUR_CANONICAL --check-github-vars
# updates README, production-site.json, extension DEFAULT_API_BASE + host_permissions,
# and rewrites docs/PUBLIC_PROMOTION.md tables; then gh-compares Actions vars
npm run health:prod -- --url https://YOUR_CANONICAL
npm run check:prod -- --url https://YOUR_CANONICAL
```

Commit those files. Confirm [PUBLIC_PROMOTION.md](PUBLIC_PROMOTION.md) shows **only** the new canonical + `/en/privacy` (and optional pt-PT).

## 6. OG / social absolute URL check

After DNS + second deploy:

1. Open [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) and [Twitter Card Validator](https://cards-dev.twitter.com/validator) (or equivalent).
2. Paste `https://YOUR_CANONICAL/` and confirm `og:image` resolves to `https://YOUR_CANONICAL/og.png` (not a stale `*.workers.dev` URL).
3. If the debugger still shows workers.dev, hard-refresh the scrape and verify GitHub var `NEXT_PUBLIC_SITE_URL` matched the deploy.

`npm run production:origin` prints the same reminder.

## 7. Checklist

Mark the custom-domain rows in [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) § B.  
Ops overview: [OPS_RUNBOOK.md](OPS_RUNBOOK.md).