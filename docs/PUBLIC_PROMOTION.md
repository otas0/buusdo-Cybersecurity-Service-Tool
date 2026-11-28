# Public promotion copy (canonical only)

**Line vs product (always):** Buusdo = product **line**. This product = **buusdo Cybersecurity Service Tool** (not Buusdo itself, not other Buusdo-line apps).

Until a custom domain replaces workers.dev, the **only** public links are:

| Surface | URL |
|---------|-----|
| Canonical product | `https://buusdocst.mtsu.workers.dev` |
| Privacy (EN) | `https://buusdocst.mtsu.workers.dev/en/privacy` |
| Privacy (optional locale) | `https://buusdocst.mtsu.workers.dev/pt-PT/privacy` |
| China notice (GitHub Pages) | `https://otas0.github.io/buusdocst/` — **大陆检查服务未开放** 告知书（勿指望 Workers 跳转；[CHINA_GITHUB_PAGES.md](CHINA_GITHUB_PAGES.md)） |
| A4 poster (print handoff only) | `https://buusdocst.mtsu.workers.dev/promo/poster.html` — EN / pt-PT / 中文. **Not** product chrome (nav / Settings / extension / desktop footer must not link this). |
| A4 poster (legacy pt URL) | `…/promo/poster-pt.html` → meta-refresh redirect to `poster.html` (keep for old links; see [promo/README.md](promo/README.md)) |

After a custom domain, `npm run production:origin -- https://YOUR_CANONICAL` rewrites this table. Also set GitHub `NEXT_PUBLIC_SITE_URL` + `PRODUCTION_HEALTH_URL` ([CUSTOM_DOMAIN_REDEPLOY.md](CUSTOM_DOMAIN_REDEPLOY.md)).

**Print QA:** one physical A4 at **100%** / margins **None** / background graphics On ([promo/README.md](promo/README.md)).

## Ready-to-paste (EN · CF-reachable / global)

Do **not** use this block for mainland-only WeChat / store China fields (use 中文 · 大陆 below).

```
buusdo Cybersecurity Service Tool (Buusdo product line).
Check a website before you trust it.
Product (Workers): https://buusdocst.mtsu.workers.dev
China notice (mainland service not offered; CN force-redirect when Workers is reachable): https://otas0.github.io/buusdocst/
A4 poster: https://buusdocst.mtsu.workers.dev/promo/poster.html
Privacy: https://buusdocst.mtsu.workers.dev/en/privacy
```

## Ready-to-paste (pt-PT · CF-reachable / global)

```
buusdo Cybersecurity Service Tool (linha Buusdo).
Verifique um site antes de confiar.
Produto (Workers): https://buusdocst.mtsu.workers.dev
Aviso China (serviço não oferecido no continente; redirecionamento CN se Workers for alcançável): https://otas0.github.io/buusdocst/
Cartaz A4: https://buusdocst.mtsu.workers.dev/promo/poster.html
Privacidade: https://buusdocst.mtsu.workers.dev/en/privacy
```

## Ready-to-paste (中文 · 面向大陆用户) — **no Workers URL**

大陆网络常无法打开 `workers.dev`，**也不会自动跳转**。面向大陆只发告知书链接 / 二维码（禁止混发 Workers）：

```
【重要】buusdo Cybersecurity Service Tool
中国大陆地区：完整网站检查服务未开放、不作可用性承诺。
请阅读官方告知书（勿等待 workers.dev 跳转）：
https://otas0.github.io/buusdocst/
```

## Ready-to-paste (中文 · 全球 / 可访问 Cloudflare 时)

Only when the audience can reach Cloudflare (not mainland-only channels):

```
buusdo Cybersecurity Service Tool（Buusdo 产品线）。
访问网站前先核查地址。
产品（Workers）：https://buusdocst.mtsu.workers.dev
中国告知书（大陆服务未开放说明；可达 Workers 且 CF=CN 时强制引导至此）：https://otas0.github.io/buusdocst/
A4 海报：https://buusdocst.mtsu.workers.dev/promo/poster.html
隐私：https://buusdocst.mtsu.workers.dev/en/privacy
```

## Do

- Name the **product** (`buusdo Cybersecurity Service Tool`) and, when useful, the **line** (`Buusdo`) — never imply they are the same product.
- Always show **Workers product** and **China Pages notice** as two distinct surfaces (API vs 告知书; CN HTML force-redirect when reachable).
- **Mainland-facing posts / WeChat / store / QR:** lead with「大陆检查服务未开放」+ **only** `https://otas0.github.io/buusdocst/` — never tell users to open Workers first.
- Link **only** the canonical origin + privacy page(s) + the single China notice URL above (no install/privacy subpaths) when addressing CF-reachable audiences.
- Always include privacy before asking people to use the product.
- Desktop downloads are **unsigned** GitHub Release builds — say Gatekeeper / SmartScreen warnings are expected; point to [DESKTOP_SETUP_GUIDE.md](DESKTOP_SETUP_GUIDE.md) (never imply Apple notarization or Authenticode).

## Do not

- Call this product just “Buusdo” (that is the line, not this product)
- Use short **“buusdo”** alone as the product name in posts, store titles, or press — always **buusdo Cybersecurity Service Tool** (shortName is UI chrome only)
- Advertise both `www` and apex
- Link localhost, preview URLs, or alternate workers.dev hostnames (`pcpd`, `preventive-shield` — those Workers are deleted)
- Republish or advertise any hostname other than `buusdocst.mtsu.workers.dev` / `otas0.github.io/buusdocst`
- Link A4 / `/promo/poster.html` from product chrome (nav, Settings, extension, desktop footer) — print handoff URL only
- Promise cloud Account sync, cross-device cloud lists, or magic-link sign-in ([ACCOUNT_SYNC_GATE.md](ACCOUNT_SYNC_GATE.md))
- Publish check results or sample “risky” URLs that still work as phish bait

## Cross-device lists (allowed wording)

Say only: lists stay on-device; move them with **export/import JSON or QR**, or sync desktop **`shield-backup.json`** yourself (USB / Drive / Syncthing). See [OFFLINE_LIST_SYNC.md](OFFLINE_LIST_SYNC.md).

## Spot-check (before each external post)

Paste-ready blocks above must contain **zero** of: `pcpd.`, `preventive-shield.`, `localhost`, `127.0.0.1`. Allowed hosts only: `buusdocst.mtsu.workers.dev`, `otas0.github.io/buusdocst`.