# Public promotion copy (canonical only)

**Line vs product (always):** Buusdo = product **line**. This product = **buusdo Cybersecurity Service Tool** (separate product — not Buusdo itself, not other Buusdo-line apps).

Until a custom domain replaces workers.dev, the **only** public links are:

| Surface | URL |
|---------|-----|
| Canonical product | `https://buusdocst.mtsu.workers.dev` |
| Privacy (EN) | `https://buusdocst.mtsu.workers.dev/en/privacy` |
| Privacy (pt-PT) | `https://buusdocst.mtsu.workers.dev/pt-PT/privacy` (optional second locale link) |
| China entry (GitHub Pages) | `https://otas0.github.io/buusdocst/` — explain/privacy/install when Workers is hard to reach ([CHINA_GITHUB_PAGES.md](CHINA_GITHUB_PAGES.md)) |

After a custom domain, `npm run production:origin -- https://YOUR_CANONICAL` rewrites this table. Also set GitHub `NEXT_PUBLIC_SITE_URL` + `PRODUCTION_HEALTH_URL` ([CUSTOM_DOMAIN_REDEPLOY.md](CUSTOM_DOMAIN_REDEPLOY.md)).

## Ready-to-paste (EN)

```
buusdo Cybersecurity Service Tool (Buusdo product line — separate product).
Check a website before you trust it.
Product (Workers): https://buusdocst.mtsu.workers.dev
China entry (GitHub Pages): https://otas0.github.io/buusdocst/
Privacy: https://buusdocst.mtsu.workers.dev/en/privacy
```

## Ready-to-paste (pt-PT)

```
buusdo Cybersecurity Service Tool (linha Buusdo — produto distinto).
Verifique um site antes de confiar.
Produto (Workers): https://buusdocst.mtsu.workers.dev
Entrada China (GitHub Pages): https://otas0.github.io/buusdocst/
Privacidade: https://buusdocst.mtsu.workers.dev/pt-PT/privacy
```

## Do

- Name the **product** (`buusdo Cybersecurity Service Tool`) and, when useful, the **line** (`Buusdo`) — never imply they are the same product.
- Always show **Workers product** and **China Pages entry** as two distinct surfaces (API vs static explain/privacy/install).
- Link **only** the canonical origin + privacy page(s) + China entry above.
- Always include privacy before asking people to use the product.

## Do not

- Call this product just “Buusdo” (that is the line, not this product)
- Advertise both `www` and apex
- Link localhost, preview URLs, or alternate workers.dev hostnames
- Promote Account sync while it is off ([ACCOUNT_SYNC_GATE.md](ACCOUNT_SYNC_GATE.md))
- Publish check results or sample “risky” URLs that still work as phish bait