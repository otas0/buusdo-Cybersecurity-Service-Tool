# Launch checklist (website-first · Cloudflare)

Use this for the first public website launch on **Cloudflare Workers**. Default: **account sync off**.

## A. Pre-flight (local)

- [ ] Node ≥ 22.13; `npm ci`
- [ ] `npm run check` (or `npm test` + `npm run threat:check` + `npm run build`)
- [ ] `npm run openapi:check`
- [ ] Manual: `/en`, `/pt-PT`, Settings privacy, one check via `npm run dev`

## B. Cloudflare hosting

- [ ] `npx wrangler login` (or CI token) + `CLOUDFLARE_ACCOUNT_ID` set
- [ ] `npm run deploy:cloudflare` succeeds
- [ ] `*.workers.dev` health: `npm run health:prod -- --url https://…workers.dev` → `curatedListPresent: true`
- [ ] `npm run check:prod -- --url https://…workers.dev` exits 0 (Workers outbound fetch + probe)
- [ ] `npm run production:origin -- https://…` updates README + client defaults; commit
- [ ] Custom domain attached on the Worker + TLS green
- [ ] One canonical host only ([CANONICAL_HOST.md](CANONICAL_HOST.md))
- [ ] `NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN` set for the deploy build
- [ ] Redeploy after setting the public URL
- [ ] `npm run health:prod` + `npm run check:prod` against the canonical domain exit 0

## C. Monitoring

- [ ] Repo variable `PRODUCTION_HEALTH_URL=https://YOUR_DOMAIN`
- [ ] Actions → **Production health** run is green
- [ ] Cloudflare Workers error + CPU alert emails ([CLOUDFLARE_ALERTS.md](CLOUDFLARE_ALERTS.md))
- [ ] Optional: Actions → **Deploy Cloudflare** secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`)

## D. Product defaults (first launch)

- [ ] `ACCOUNT_SYNC_ENABLED` off; `ACCOUNT_SYNC_REQUIRE_TURSO=1` stays on in `wrangler.jsonc`
- [ ] No mailer / Turso secrets required yet
- [ ] Privacy pages live: `/en/privacy`, `/pt-PT/privacy` — **before** public promotion
- [ ] Extension / desktop defaults follow `production:origin` (or env override)

## E. Go / no-go

| Signal | Go |
|--------|-----|
| Health | `ok`, `curatedListPresent: true`, own threat intel |
| Check API | `POST /api/check` returns timing-valid analysis |
| Locales | `/en`, `/pt-PT`, privacy pages load |
| Secrets | Only in Wrangler secrets / CI — not in git |
| Canonical | Single public origin |

## F. After go-live (first 48h)

- [ ] Follow [POST_LAUNCH_48H.md](POST_LAUNCH_48H.md) — health + check only; no large new features
- [ ] Watch health-monitor + Workers metrics (errors, CPU)
- [ ] Spot-check rate limits under light load
- [ ] Do **not** enable account sync until Turso (`DATABASE_URL`) + mailer are ready