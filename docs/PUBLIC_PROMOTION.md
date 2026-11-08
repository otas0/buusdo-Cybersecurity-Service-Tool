# Public promotion copy (canonical only)

**Line vs product (always):** Buusdo = product **line**. This product = **buusdo Cybersecurity Service Tool** (not Buusdo itself, not other Buusdo-line apps).

Until a custom domain replaces workers.dev, the **only** public links are:

| Surface | URL |
|---------|-----|
| Canonical product | `https://buusdocst.mtsu.workers.dev` |
| Privacy (EN) | `https://buusdocst.mtsu.workers.dev/en/privacy` |
| Privacy (optional locale) | `https://buusdocst.mtsu.workers.dev/pt-PT/privacy` |
| China entry (GitHub Pages) | `https://otas0.github.io/buusdocst/` — explain/privacy/install when Workers is hard to reach ([CHINA_GITHUB_PAGES.md](CHINA_GITHUB_PAGES.md)) |
| A4 poster (print) | `https://buusdocst.mtsu.workers.dev/promo/poster.html` — EN / pt-PT / 中文 |
| A4 poster (legacy pt URL) | `…/promo/poster-pt.html` → meta-refresh redirect to `poster.html` (keep for old links; see [promo/README.md](promo/README.md)) |

After a custom domain, `npm run production:origin -- https://YOUR_CANONICAL` rewrites this table. Also set GitHub `NEXT_PUBLIC_SITE_URL` + `PRODUCTION_HEALTH_URL` ([CUSTOM_DOMAIN_REDEPLOY.md](CUSTOM_DOMAIN_REDEPLOY.md)).

**Print QA:** one physical A4 at **100%** / margins **None** / background graphics On ([promo/README.md](promo/README.md)).

## Ready-to-paste (EN)

```
buusdo Cybersecurity Service Tool (Buusdo product line).
Check a website before you trust it.
Product (Workers): https://buusdocst.mtsu.workers.dev
China entry (GitHub Pages): https://otas0.github.io/buusdocst/
A4 poster: https://buusdocst.mtsu.workers.dev/promo/poster.html
Privacy: https://buusdocst.mtsu.workers.dev/en/privacy
```

## Ready-to-paste (alternate locale)

```
buusdo Cybersecurity Service Tool (linha Buusdo).
Verifique um site antes de confiar.
Produto (Workers): https://buusdocst.mtsu.workers.dev
Entrada China (GitHub Pages): https://otas0.github.io/buusdocst/
Cartaz A4: https://buusdocst.mtsu.workers.dev/promo/poster.html
Privacidade: https://buusdocst.mtsu.workers.dev/en/privacy
```

## Ready-to-paste (中文)

```
buusdo Cybersecurity Service Tool（Buusdo 产品线）。
访问网站前先核查地址。
产品（Workers）：https://buusdocst.mtsu.workers.dev
中国入口（GitHub Pages）：https://otas0.github.io/buusdocst/
A4 海报：https://buusdocst.mtsu.workers.dev/promo/poster.html
隐私：https://buusdocst.mtsu.workers.dev/en/privacy
```

## Do

- Name the **product** (`buusdo Cybersecurity Service Tool`) and, when useful, the **line** (`Buusdo`) — never imply they are the same product.
- Always show **Workers product** and **China Pages entry** as two distinct surfaces (API vs static explain/privacy/install).
- Link **only** the canonical origin + privacy page(s) + China entry above.
- Always include privacy before asking people to use the product.
- Desktop downloads are **unsigned** GitHub Release builds — say Gatekeeper / SmartScreen warnings are expected; point to [DESKTOP_SETUP_GUIDE.md](DESKTOP_SETUP_GUIDE.md) (never imply Apple notarization or Authenticode).

## Do not

- Call this product just “Buusdo” (that is the line, not this product)
- Use short **“buusdo”** alone as the product name in posts, store titles, or press — always **buusdo Cybersecurity Service Tool** (shortName is UI chrome only)
- Advertise both `www` and apex
- Link localhost, preview URLs, or alternate workers.dev hostnames (`pcpd`, `preventive-shield` — those Workers are deleted)
- Republish or advertise any hostname other than `buusdocst.mtsu.workers.dev` / `otas0.github.io/buusdocst`
- Promise cloud Account sync, cross-device cloud lists, or magic-link sign-in ([ACCOUNT_SYNC_GATE.md](ACCOUNT_SYNC_GATE.md))
- Publish check results or sample “risky” URLs that still work as phish bait

## Cross-device lists (allowed wording)

Say only: lists stay on-device; move them with **export/import JSON or QR**, or sync desktop **`shield-backup.json`** yourself (USB / Drive / Syncthing). See [OFFLINE_LIST_SYNC.md](OFFLINE_LIST_SYNC.md).

## Spot-check (before each external post)

Paste-ready blocks above must contain **zero** of: `pcpd.`, `preventive-shield.`, `localhost`, `127.0.0.1`. Allowed hosts only: `buusdocst.mtsu.workers.dev`, `otas0.github.io/buusdocst`.