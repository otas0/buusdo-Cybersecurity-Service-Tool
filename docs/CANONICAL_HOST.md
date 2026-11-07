# Canonical host (www vs apex)

Ship **one** public origin. Do not advertise both `https://example.com` and `https://www.example.com` as equal.

**workers.dev phase:** the single canonical origin is  
`https://buusdocst.mtsu.workers.dev`  
(until a custom domain replaces it — then re-run `production:origin` and update `PRODUCTION_HEALTH_URL`).


## Choose

| Choice | When |
|--------|------|
| **Apex** (`shield.example.com` or bare `example.com`) | Default for this product — shorter, matches most `NEXT_PUBLIC_SITE_URL` examples |
| **www** | Only if existing brand DNS already lives on www |

## Configure

1. Cloudflare DNS / Workers **Custom Domains**: attach the canonical host to the Worker.
2. Redirect the other host → canonical (Cloudflare Bulk Redirect, page rule, or DNS-only + Worker route). Prefer **301**.
3. Set `NEXT_PUBLIC_SITE_URL` to the canonical origin (**no** trailing slash) and redeploy.
4. Run `npm run production:origin -- https://CANONICAL` so README, extension `DEFAULT_API_BASE`, and desktop `production-site.json` match.

## Check

```bash
# Canonical answers health
npm run health:prod -- --url https://CANONICAL

# Non-canonical should redirect (browser or curl -I)
curl -sI https://www.CANONICAL | head -n 5
```

`shared/production-site.json` → `canonicalHost` stores the host without a leading `www.` for docs; the **origin** string is whatever you pass to `production:origin` (must be the live HTTPS origin users hit).