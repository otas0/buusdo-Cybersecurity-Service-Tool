# Public promotion copy (canonical only)

Until a custom domain replaces workers.dev, the **only** public links are:

| Surface | URL |
|---------|-----|
| Canonical product | `https://pcpd.mtsu.workers.dev` |
| Privacy (EN) | `https://pcpd.mtsu.workers.dev/en/privacy` |
| Privacy (pt-PT) | `https://pcpd.mtsu.workers.dev/pt-PT/privacy` (optional second locale link) |

After a custom domain, `npm run production:origin -- https://YOUR_CANONICAL` rewrites this table. Also set GitHub `NEXT_PUBLIC_SITE_URL` + `PRODUCTION_HEALTH_URL` ([CUSTOM_DOMAIN_REDEPLOY.md](CUSTOM_DOMAIN_REDEPLOY.md)).

## Ready-to-paste (EN)

```
Preventive Shield — check a website before you trust it.
https://pcpd.mtsu.workers.dev
Privacy: https://pcpd.mtsu.workers.dev/en/privacy
```

## Ready-to-paste (pt-PT)

```
Escudo Preventivo — verifique um site antes de confiar.
https://pcpd.mtsu.workers.dev
Privacidade: https://pcpd.mtsu.workers.dev/pt-PT/privacy
```

## Do

- Link **only** the canonical origin + privacy page(s) above.
- Always include privacy before asking people to use the product.

## Do not

- Advertise both `www` and apex
- Link localhost, preview URLs, or alternate workers.dev hostnames
- Promote Account sync while it is off ([ACCOUNT_SYNC_GATE.md](ACCOUNT_SYNC_GATE.md))
- Publish check results or sample “risky” URLs that still work as phish bait
