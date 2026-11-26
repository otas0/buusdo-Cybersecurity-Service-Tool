# Launch checklist (website-first · Cloudflare)

Use this for the first public website launch on **Cloudflare Workers**. Default: **account sync off**.

**Current live origin (workers.dev):** `https://buusdocst.mtsu.workers.dev`  
Recorded via `npm run production:origin` → README + `shared/production-site.json` + extension `DEFAULT_API_BASE`.

## A. Pre-flight (local)

- [x] Node ≥ 22.13; `npm ci`
- [x] `npm run check` (2026-11-01 — tests + typecheck + lint + threat:check + build)
- [ ] `npm run openapi:check` (run before OpenAPI-touching commits)
- [x] OpenAPI / health **1.5.3** — `localeCount` + `regionCount` + `localesByRegion` on `GET /api/health`; `health-smoke` asserts `localeCount ≥ 40`, full region keys, and `localesByRegion.europe ≥ 20` (2026-11-08). Schema: [`docs/openapi-check-timing.yaml`](./openapi-check-timing.yaml) → property [`localeCount`](./openapi-check-timing.yaml#L345)
- [ ] Manual: `/en`, `/pt-PT`, Settings, privacy, one check via `npm run dev`
- [ ] Promo mirror: `npm run build:promo-posters` then open `/promo/poster.html` (EN / pt-PT / 中文); Print A4 · 100% · Margins None fits one page; live + China QR scan OK
- [ ] After deploy: `https://buusdocst.mtsu.workers.dev/promo/poster.html` 200 + cache-bust wordmark loads

## B. Cloudflare hosting

- [x] `npx wrangler login` + account available
- [x] `npm run deploy:cloudflare` succeeds → `https://buusdocst.mtsu.workers.dev`
- [x] Health (remote): `ok`, **`curatedListPresent: true`**, `accountSyncEnabled: false` (2026-11-01)
- [x] **`check:prod`** against the origin — **OK** via GitHub ubuntu ([41285063357](https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/41285063357)) + CF-reachable browser. Local laptop still TCP-timeouts `*.workers.dev` ([LOCAL_CF_CONNECTIVITY.md](LOCAL_CF_CONNECTIVITY.md)). Log below.
- [x] `npm run production:origin -- https://buusdocst.mtsu.workers.dev` committed
- [x] OG / social: Facebook Sharing Debugger + Twitter Card Validator on `https://buusdocst.mtsu.workers.dev` — `og:image` → `https://buusdocst.mtsu.workers.dev/og.png` (2026-11-07)
- [ ] Custom domain attached on the Worker + TLS green ([CUSTOM_DOMAIN_REDEPLOY.md](CUSTOM_DOMAIN_REDEPLOY.md)) — **hold** until [POST_LAUNCH_48H.md](POST_LAUNCH_48H.md) hygiene (CF alerts + Metrics baselines); independent of Account sync
- [ ] One canonical host only ([CANONICAL_HOST.md](CANONICAL_HOST.md)) — when custom domain exists
- [ ] `NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN` set for the **second** deploy build
- [ ] `npm run production:origin -- https://YOUR_DOMAIN --check-github-vars` after vars update
- [ ] Redeploy after setting the public URL
- [ ] `npm run health:prod` + `npm run check:prod` against the canonical domain exit 0

### check:prod log

| When (UTC) | Runner | Result | Notes |
|------------|--------|--------|-------|
| 2026-11-26 | github-actions/45743202546 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · smoke:privacy-china=2026-11-26T02:33Z · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/45743202546 |
| 2026-11-25 | github-actions/45689706480 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · smoke:privacy-china=2026-11-25T19:54Z · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/45689706480 |
| 2026-11-25 | github-actions/45590766273 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · smoke:privacy-china=2026-11-25T10:00Z · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/45590766273 |
| 2026-11-25 | github-actions/45525545152 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · smoke:privacy-china=2026-11-25T01:24Z · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/45525545152 |
| 2026-11-24 | github-actions/45443925944 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · smoke:privacy-china=2026-11-24T17:01Z · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/45443925944 |
| 2026-11-24 | github-actions/45336988978 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · smoke:privacy-china=2026-11-24T05:58Z · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/45336988978 |
| 2026-11-23 | github-actions/45276536243 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · smoke:privacy-china=2026-11-23T22:07Z · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/45276536243 |
| 2026-11-23 | github-actions/45155767864 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · smoke:privacy-china=2026-11-23T10:24Z · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/45155767864 |
| 2026-11-23 | github-actions/45097543003 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · smoke:privacy-china=2026-11-23T01:58Z · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/45097543003 |
| 2026-11-22 | github-actions/45073717268 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · smoke:privacy-china=2026-11-22T21:43Z · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/45073717268 |
| 2026-11-22 | github-actions/45041539248 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · smoke:privacy-china=2026-11-22T16:02Z · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/45041539248 |
| 2026-11-22 | github-actions/45000685739 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/45000685739 |
| 2026-11-22 | github-actions/44970448022 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/44970448022 |
| 2026-11-21 | github-actions/44949926387 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/44949926387 |
| 2026-11-21 | github-actions/44920156374 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/44920156374 |
| 2026-11-21 | github-actions/44881396116 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/44881396116 |
| 2026-11-21 | github-actions/44844328231 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/44844328231 |
| 2026-11-20 | github-actions/44797245644 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/44797245644 |
| 2026-11-20 | github-actions/44721867654 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/44721867654 |
| 2026-11-20 | github-actions/44663274238 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/44663274238 |
| 2026-11-19 | github-actions/44623690455 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/44623690455 |
| 2026-11-19 | github-actions/44537954886 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/44537954886 |
| 2026-11-19 | github-actions/44458743715 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/44458743715 |
| 2026-11-18 | github-actions/44421972515 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/44421972515 |
| 2026-11-18 | github-actions/44361332788 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/44361332788 |
| 2026-11-18 | github-actions/44270386826 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/44270386826 |
| 2026-11-18 | github-actions/44215854703 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/44215854703 |
| 2026-11-17 | github-actions/44152506690 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/44152506690 |
| 2026-11-17 | github-actions/44059890495 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/44059890495 |
| 2026-11-17 | github-actions/43998700009 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/43998700009 |
| 2026-11-16 | github-actions/43924515184 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/43924515184 |
| 2026-11-16 | github-actions/43827639391 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/43827639391 |
| 2026-11-16 | github-actions/43784960537 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/43784960537 |
| 2026-11-15 | github-actions/43762718042 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/43762718042 |
| 2026-11-15 | github-actions/43736310860 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/43736310860 |
| 2026-11-15 | github-actions/43700352723 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/43700352723 |
| 2026-11-15 | github-actions/43667118581 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/43667118581 |
| 2026-11-14 | github-actions/43650054515 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/43650054515 |
| 2026-11-14 | github-actions/43629176708 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/43629176708 |
| 2026-11-14 | github-actions/43601914695 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/43601914695 |


## C. Monitoring

- [x] Repo variable `PRODUCTION_HEALTH_URL=https://buusdocst.mtsu.workers.dev` (otas0/buusdo-Cybersecurity-Service-Tool)
- [x] Actions → **Production health** run is green — [41285063357](https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/41285063357) (`check:prod` on ubuntu). Full checklist bot write awaits next push of local `health-monitor.yml`.
- [x] Watch repo (otas0 subscribed 2026-11-01); enable Actions failure email in GitHub notification settings if not already; Slack webhook **skipped** (do not set)
- [ ] Cloudflare Workers error + CPU alert emails — enable then **send a test** ([CLOUDFLARE_ALERTS.md](CLOUDFLARE_ALERTS.md)) — needs signed-in CF dashboard (GitHub OAuth login started; complete in browser)
- [ ] Capture Workers error/CPU baseline screenshots ([WORKERS_ERROR_BASELINE.md](WORKERS_ERROR_BASELINE.md) → `ops/workers-baselines/`) — needs CF Metrics (worker **buusdocst**)
- [x] Actions → **Deploy Cloudflare** secrets: `CLOUDFLARE_ACCOUNT_ID` **set**; `CLOUDFLARE_API_TOKEN` **set** (2026-11-07) ([DEPLOY_SECRETS.md](DEPLOY_SECRETS.md)); `NEXT_PUBLIC_SITE_URL` set to `https://buusdocst.mtsu.workers.dev` — token scopes confirmed green ([42369768115](https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/42369768115))


## D. Product defaults (first launch)

- [x] **Account sync cancelled** — `ACCOUNT_SYNC_PRODUCT_CANCELLED` + UI removed; prod/staging `ACCOUNT_SYNC_ENABLED=0` ([ACCOUNT_SYNC_GATE.md](ACCOUNT_SYNC_GATE.md))
- [x] No Turso / Resend / Postmark Account-sync secrets — do not add them
- [x] Staging STRICT Account smokes retired (workflow notice only)
- [x] **Local CF timeout:** when the laptop cannot reach `*.workers.dev`, use GitHub Actions **Production health** only ([LOCAL_CF_CONNECTIVITY.md](LOCAL_CF_CONNECTIVITY.md)) — do not treat laptop curl timeout as an outage
- [x] Holds: custom domain **independent of Account sync** ([CUSTOM_DOMAIN_REDEPLOY.md](CUSTOM_DOMAIN_REDEPLOY.md) + [POST_LAUNCH_48H.md](POST_LAUNCH_48H.md)); desktop ship = **unsigned** GitHub Release ([DESKTOP_SETUP_GUIDE.md](DESKTOP_SETUP_GUIDE.md)) — notarize/promote out of scope; Slack skipped; laptop CF → Actions only. Product: **buusdo Cybersecurity Service Tool** (Buusdo **line**, separate product).
- [x] Offline list path documented: [OFFLINE_LIST_SYNC.md](OFFLINE_LIST_SYNC.md)
- [x] **Desktop CI (unblocked):** [41440440022](https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/41440440022) (`6b5ac83`) — `desktop-linux`, `desktop-macos`, `desktop-windows` all green.
- [x] Privacy pages live: `/en/privacy`, `/pt-PT/privacy` — redeploy after copy edits, then `npm run test:playwright:privacy` on a CF-reachable machine
- [x] Workers privacy China FRAME committed: [`docs/store-screenshots/FRAME-privacy-china-notice.png`](store-screenshots/FRAME-privacy-china-notice.png) + EN twin [`FRAME-privacy-china-notice-en.png`](store-screenshots/FRAME-privacy-china-notice-en.png) (`npm run capture:privacy-china-frame`). Live section smoke: `npm run smoke:privacy-china` / Actions **Production health smoke** (`#privacy-china-notice` on `/zh-Hans/privacy` · `/en/privacy`).
- [ ] China Pages `/install.html` · `/privacy.html` stubs: **keep** until path-level traffic logs exist (custom-domain Logpush or Pages analytics), then re-evaluate delete after ≥30 days near-zero hits ([CHINA_GITHUB_PAGES.md](CHINA_GITHUB_PAGES.md))
- [x] Extension / desktop defaults follow `production:origin` (`DEFAULT_API_BASE=https://buusdocst.mtsu.workers.dev`)
- [ ] Extension: load unpacked → confirm Website API base is production → one **Run** — no Chrome/Chromium on this Mac; `DEFAULT_API_BASE` + manifest host `https://buusdocst.mtsu.workers.dev/*` verified; website Run already proved same API
- [x] Desktop: unset `WEBSITE_CHECK_URL` → reads `shared/production-site.json`; startup logs `Website origin ← …`
- [x] Public links only: canonical + `/en/privacy` ([PUBLIC_PROMOTION.md](PUBLIC_PROMOTION.md)) — `https://buusdocst.mtsu.workers.dev` + `https://buusdocst.mtsu.workers.dev/en/privacy`
- [x] `npm run hooks:install` → `core.hooksPath=.githooks`


## E. Go / no-go

| Signal | Go |
|--------|-----|
| Health | `ok`, `curatedListPresent: true`, own threat intel |
| Check API | `POST /api/check` returns timing-valid analysis (**log in table above**) |
| Locales | `/en`, `/pt-PT`, privacy pages load |
| Secrets | Only in Wrangler secrets / CI — not in git |
| Canonical | Single public origin |
| Sync | Cancelled — on-device lists + offline export only |

**Website MVP verdict (2026-11-01): GO** for public check on workers.dev. Remaining CF alert/Metrics/`CLOUDFLARE_API_TOKEN` items are ops hygiene, not product blockers.

**Extension distribute (users):** Safari → **Mac App Store**; Chrome → **Chrome Web Store**. Pack: `npm run pack:chrome-store` / `npm run safari:archive`. Fill URLs in [`shared/extension-stores.json`](../shared/extension-stores.json) after approval — [EXTENSION_STORE_DISTRIBUTE.md](EXTENSION_STORE_DISTRIBUTE.md).

## F. After go-live (first 48h)

**Freeze window started:** 2026-11-01T07:30Z (first green Production health on buusdocst). Ends ~**2026-11-03T07:30Z**.

- [x] Follow [POST_LAUNCH_48H.md](POST_LAUNCH_48H.md) — health + check only; no large new features (freeze **on**)
- [ ] Watch health-monitor + Workers metrics (errors, CPU) — health green; Metrics screenshots still pending CF login
- [ ] Spot-check rate limits under light load
- [x] Account sync cancelled — do not re-enable without a new product decision

## G. Optional / later

- [ ] **Hold:** After ops hygiene (CF Metrics baselines + alert email test + Notifications cleanup): `git checkout -b chore/vinext-1-4-eval` ([VINEXT_UPGRADE_1_4.md](VINEXT_UPGRADE_1_4.md)) — do not start vinext 1.4 eval while Metrics/Notifications screenshots are still pending
- [ ] **Hold:** Custom domain cutover — [CUSTOM_DOMAIN_REDEPLOY.md](CUSTOM_DOMAIN_REDEPLOY.md) + `npm run production:origin -- https://YOUR_DOMAIN --check-github-vars` before second deploy; refresh [PUBLIC_PROMOTION.md](PUBLIC_PROMOTION.md) after
- [x] Playwright prod privacy (browser/CDP 2026-11-01): `/en/privacy` + `/pt-PT/privacy` headings + `data-testid=privacy-policy` OK on buusdocst — full `npm run test:playwright:privacy` when Chromium install works
- [x] Prod Account-sync routes Gone (2026-11-07 browser/CDP): `GET/POST` magic+session+refresh+device+logout, `GET/DELETE` account, `GET/PUT` sync/lists → **410** `account-sync-cancelled` (`npm run assert:prod-auth-gone` from a CF-reachable host)