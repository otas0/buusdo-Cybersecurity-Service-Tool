# Launch checklist (website-first · Cloudflare)

Use this for the first public website launch on **Cloudflare Workers**. Default: **account sync off**.

**Current live origin (workers.dev):** `https://pcpd.mtsu.workers.dev`  
Recorded via `npm run production:origin` → README + `shared/production-site.json` + extension `DEFAULT_API_BASE`.

## A. Pre-flight (local)

- [x] Node ≥ 22.13; `npm ci`
- [x] `npm run check` (2026-11-01 — tests + typecheck + lint + threat:check + build)
- [ ] `npm run openapi:check` (run before OpenAPI-touching commits)
- [ ] Manual: `/en`, `/pt-PT`, Settings, privacy, one check via `npm run dev`

## B. Cloudflare hosting

- [x] `npx wrangler login` + account available
- [x] `npm run deploy:cloudflare` succeeds → `https://pcpd.mtsu.workers.dev`
- [x] Health (remote): `ok`, **`curatedListPresent: true`**, `accountSyncEnabled: false` (2026-11-01)
- [x] **`check:prod`** against the origin — **OK** via GitHub ubuntu ([41285063357](https://github.com/otas0/preventive-cybersecurity-prototype/actions/runs/41285063357)) + CF-reachable browser. Local laptop still TCP-timeouts `*.workers.dev` ([LOCAL_CF_CONNECTIVITY.md](LOCAL_CF_CONNECTIVITY.md)). Log below.
- [x] `npm run production:origin -- https://pcpd.mtsu.workers.dev` committed
- [ ] Custom domain attached on the Worker + TLS green ([CUSTOM_DOMAIN_REDEPLOY.md](CUSTOM_DOMAIN_REDEPLOY.md))
- [ ] One canonical host only ([CANONICAL_HOST.md](CANONICAL_HOST.md)) — when custom domain exists
- [ ] `NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN` set for the **second** deploy build
- [ ] Redeploy after setting the public URL
- [ ] `npm run health:prod` + `npm run check:prod` against the canonical domain exit 0

### check:prod log

| When (UTC) | Runner | Result | Notes |
|------------|--------|--------|-------|
| 2026-11-01 | github-actions/41288050274 | **OK** | `https://pcpd.mtsu.workers.dev` — health+check · https://github.com/otas0/preventive-cybersecurity-prototype/actions/runs/41288050274 |
| 2026-11-01 | Operator laptop (Asia) | **timeout** | Local TCP to previous `preventive-shield.mtsu.workers.dev` timed out; not a Worker crash — see [LOCAL_CF_CONNECTIVITY.md](LOCAL_CF_CONNECTIVITY.md) |
| 2026-11-01 | Deploy rename | **live** | Worker name `pcpd` → `https://pcpd.mtsu.workers.dev` (privacy page verified remotely) |
| 2026-11-01 | Cursor remote fetch | health **OK** | `curatedListPresent: true`; GET `/api/check` → 405 (POST-only, route present) |
| 2026-11-01T07:23Z | Cursor IDE browser (CF-reachable) | **OK** | `POST /api/check` `https://example.com` → `ok`, `timingValid`, `probeMs≈23`, `totalMs≈23`, DNS+HTTP 200, `ambiguousProbeStatus=false`. UI Run on `/en` also Clear / proceed-with-care with timing strip. |
| 2026-11-01T07:30Z | github-actions (Production health) | **OK** | [run 41285063357](https://github.com/otas0/preventive-cybersecurity-prototype/actions/runs/41285063357) ubuntu · `PRODUCTION_HEALTH_URL=https://pcpd.mtsu.workers.dev` · health `ok`+`curatedListPresent` · check `ok`+`timingValid` · `probeMs=13` `totalMs=13` |


## C. Monitoring

- [x] Repo variable `PRODUCTION_HEALTH_URL=https://pcpd.mtsu.workers.dev` (otas0/preventive-cybersecurity-prototype)
- [x] Actions → **Production health** run is green — [41285063357](https://github.com/otas0/preventive-cybersecurity-prototype/actions/runs/41285063357) (`check:prod` on ubuntu). Full checklist bot write awaits next push of local `health-monitor.yml`.
- [x] Watch repo (otas0 subscribed 2026-11-01); enable Actions failure email in GitHub notification settings if not already; optional secret `SLACK_WEBHOOK_URL` (unset)
- [ ] Cloudflare Workers error + CPU alert emails — enable then **send a test** ([CLOUDFLARE_ALERTS.md](CLOUDFLARE_ALERTS.md)) — needs signed-in CF dashboard (GitHub OAuth login started; complete in browser)
- [ ] Capture Workers error/CPU baseline screenshots ([WORKERS_ERROR_BASELINE.md](WORKERS_ERROR_BASELINE.md) → `ops/workers-baselines/`) — needs CF Metrics (worker **pcpd**)
- [ ] Actions → **Deploy Cloudflare** secrets: `CLOUDFLARE_ACCOUNT_ID` **set**; `CLOUDFLARE_API_TOKEN` **still needed** ([DEPLOY_SECRETS.md](DEPLOY_SECRETS.md)); `NEXT_PUBLIC_SITE_URL` set to pcpd


## D. Product defaults (first launch)

- [x] `ACCOUNT_SYNC_ENABLED=0`; `ACCOUNT_SYNC_REQUIRE_TURSO=1` in `wrangler.jsonc` — **keep sync off** until Turso + mailer ([ACCOUNT_SYNC_GATE.md](ACCOUNT_SYNC_GATE.md))
- [x] No mailer / Turso secrets required yet — do **not** enable Account sync / Turso / Resend until gate checklist is complete
- [x] Privacy pages live: `/en/privacy`, `/pt-PT/privacy` — redeploy after copy edits, then `npm run test:playwright:privacy` on a CF-reachable machine
- [x] Extension / desktop defaults follow `production:origin` (`DEFAULT_API_BASE=https://pcpd.mtsu.workers.dev`)
- [ ] Extension: load unpacked → confirm Website API base is production → one **Run** — no Chrome/Chromium on this Mac; `DEFAULT_API_BASE` + manifest host `https://pcpd.mtsu.workers.dev/*` verified; website Run already proved same API
- [x] Desktop: unset `WEBSITE_CHECK_URL` → reads `shared/production-site.json`; startup logs `Website origin ← …`
- [x] Public links only: canonical + `/en/privacy` ([PUBLIC_PROMOTION.md](PUBLIC_PROMOTION.md)) — `https://pcpd.mtsu.workers.dev` + `https://pcpd.mtsu.workers.dev/en/privacy`
- [x] `npm run hooks:install` → `core.hooksPath=.githooks`


## E. Go / no-go

| Signal | Go |
|--------|-----|
| Health | `ok`, `curatedListPresent: true`, own threat intel |
| Check API | `POST /api/check` returns timing-valid analysis (**log in table above**) |
| Locales | `/en`, `/pt-PT`, privacy pages load |
| Secrets | Only in Wrangler secrets / CI — not in git |
| Canonical | Single public origin |
| Sync | Off until Turso + production mailer |

## F. After go-live (first 48h)

**Freeze window started:** 2026-11-01T07:30Z (first green Production health on pcpd). Ends ~**2026-11-03T07:30Z**.

- [x] Follow [POST_LAUNCH_48H.md](POST_LAUNCH_48H.md) — health + check only; no large new features (freeze **on**)
- [ ] Watch health-monitor + Workers metrics (errors, CPU) — health green; Metrics screenshots still pending CF login
- [ ] Spot-check rate limits under light load
- [x] Do **not** enable account sync until Turso (`DATABASE_URL`) + mailer are ready

## G. Optional / later

- [ ] After 48h: `git checkout -b chore/vinext-1-4-eval` ([VINEXT_UPGRADE_1_4.md](VINEXT_UPGRADE_1_4.md))
- [ ] Custom domain: follow [CUSTOM_DOMAIN_REDEPLOY.md](CUSTOM_DOMAIN_REDEPLOY.md) then refresh public promotion URLs
- [x] Playwright prod privacy (browser/CDP 2026-11-01): `/en/privacy` + `/pt-PT/privacy` headings + `data-testid=privacy-policy` OK on pcpd — full `npm run test:playwright:privacy` when Chromium install works

