# Launch checklist (website-first · Cloudflare)

Use this for the first public website launch on **Cloudflare Workers**. Default: **account sync off**.

**Current live origin (workers.dev):** `https://buusdocst.mtsu.workers.dev`  
Recorded via `npm run production:origin` → README + `shared/production-site.json` + extension `DEFAULT_API_BASE`.

## A. Pre-flight (local)

- [x] Node ≥ 22.13; `npm ci`
- [x] `npm run check` (2026-11-01 — tests + typecheck + lint + threat:check + build)
- [ ] `npm run openapi:check` (run before OpenAPI-touching commits)
- [ ] Manual: `/en`, `/pt-PT`, Settings, privacy, one check via `npm run dev`

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
| 2026-11-07 | github-actions/42375644625 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/42375644625 |
| 2026-11-07 | github-actions/42375616416 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=0 · notarized=missing · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/42375616416 |
| 2026-11-07 | github-actions/42372070852 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=5 · notarized=http-404 · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/42372070852 |
| 2026-11-07 | github-actions/42331730285 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=5 · notarized=http-404 · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/42331730285 |
| 2026-11-06 | github-actions/42311307397 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=5 · notarized=http-404 · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/42311307397 |
| 2026-11-06 | github-actions/42269066625 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=5 · notarized=http-404 · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/42269066625 |
| 2026-11-06 | github-actions/42210596370 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=5 · notarized=http-404 · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/42210596370 |
| 2026-11-06 | github-actions/42157888520 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=5 · notarized=http-404 · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/42157888520 |
| 2026-11-05 | github-actions/42130697907 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=5 · notarized=http-404 · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/42130697907 |
| 2026-11-05 | github-actions/42081612287 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=5 · notarized=http-404 · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/42081612287 |
| 2026-11-05 | github-actions/42010464093 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=5 · notarized=http-404 · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/42010464093 |
| 2026-11-05 | github-actions/41958585164 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=5 · notarized=http-404 · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/41958585164 |
| 2026-11-04 | github-actions/41928991380 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=5 · notarized=http-404 · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/41928991380 |
| 2026-11-04 | github-actions/41879295566 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=5 · notarized=http-404 · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/41879295566 |
| 2026-11-04 | github-actions/41810475146 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=5 · notarized=http-404 · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/41810475146 |
| 2026-11-04 | github-actions/41762506152 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=5 · notarized=http-404 · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/41762506152 |
| 2026-11-03 | github-actions/41733167298 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=5 · notarized=http-404 · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/41733167298 |
| 2026-11-03 | github-actions/41687752658 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=5 · notarized=http-404 · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/41687752658 |
| 2026-11-03 | github-actions/41616085690 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=5 · notarized=http-404 · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/41616085690 |
| 2026-11-03 | github-actions/41566688358 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=5 · notarized=http-404 · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/41566688358 |
| 2026-11-02 | github-actions/41519257221 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=5 · notarized=http-404 · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/41519257221 |
| 2026-11-02 | github-actions/41427534121 | **OK** | `https://buusdocst.mtsu.workers.dev` — health+check · softDownloadWarn=5 · notarized=http-404 · https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/41427534121 |
| 2026-11-01 | Operator laptop (Asia) | **timeout** | Local TCP to previous `preventive-shield.mtsu.workers.dev` timed out; not a Worker crash — see [LOCAL_CF_CONNECTIVITY.md](LOCAL_CF_CONNECTIVITY.md) |
| 2026-11-01 | Deploy rename | **live** | Worker name `pcpd` → `https://buusdocst.mtsu.workers.dev` (privacy page verified remotely) |
| 2026-11-01 | Cursor remote fetch | health **OK** | `curatedListPresent: true`; GET `/api/check` → 405 (POST-only, route present) |
| 2026-11-01T07:23Z | Cursor IDE browser (CF-reachable) | **OK** | `POST /api/check` `https://example.com` → `ok`, `timingValid`, `probeMs≈23`, `totalMs≈23`, DNS+HTTP 200, `ambiguousProbeStatus=false`. UI Run on `/en` also Clear / proceed-with-care with timing strip. |
| 2026-11-01T07:30Z | github-actions (Production health) | **OK** | [run 41285063357](https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/actions/runs/41285063357) ubuntu · `PRODUCTION_HEALTH_URL=https://buusdocst.mtsu.workers.dev` · health `ok`+`curatedListPresent` · check `ok`+`timingValid` · `probeMs=13` `totalMs=13` |
| 2026-11-01 | OPS sample (format) | **OK** | health+check · softDownloadWarn=0 · notarized=ok · https://example.test/actions/runs/0 |
| 2026-11-01 | OPS note | — | Soft Slack skip → Actions summary \`rateLimited=true\` (not a checklist FAIL) |


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