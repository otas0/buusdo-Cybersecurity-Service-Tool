# CI notes

- China soft-fail Playwright artifact name: **`china-soft-fail-playwright`** (uploaded from the optional Playwright Settings job after `npm run test:playwright:china-soft-fail`; Job Summary links this doc + `artifact-url`; self-check fails if both `artifact-url` and `artifact-id` are empty after a successful upload). Upload uses `if-no-files-found: error` — empty report/test-results fails the job.
- Extension clear-stay harness: on failure, uploads **`extension-china-stay-clear-playwright`** (Playwright report / test-results) for nightly triage.
- Health monitor checklist append emits `dropped_rows` (cap via `CHECKLIST_LOG_MAX_ROWS`) into the Job Summary and a `::notice::DROPPED_ROWS=N` annotation for Actions search. When dropped rows exceed **half** of the cap, Summary also gets a dedicated **Half-cap warning** bullet (plus `::warning::`).
- Soft-live hash streak: **Privacy prod smoke** and CI **Soft privacy-prod** both reset from `ci/soft-live-hash-inview-outcome.json` the same way (suite soft-green + inview soft-fail → `--reset`). Privacy prod restores the prior `soft-live-hash-streak` artifact, bumps via `scripts/bump-soft-live-hash-streak.mjs`, uploads again (inview outcome uploaded as `soft-live-hash-inview-outcome`). Committed `ci/soft-live-hash-streak.json` stays at streak=0 baseline. check:desktop Summary also prints `[soft-live-hash] streak=N/3` via `scripts/append-check-desktop-summary.mjs`.
- Pack coverage step also runs `scripts/assert-min-supported-floor-linked.mjs` (next to pack-coverage / tip must-stay-full).
- Pack CAPTIONS China FRAME: listing-draft PRs **or** `workflow_dispatch` (forced store screenshot rebuild).
- **SOFT_LIVE_* env / artifact table:** see [docs/I18N.md — SOFT_LIVE hash (extension unpark)](I18N.md#soft_live-hash-extension-unpark). Extension unpark gate points there from [`extension/README.md`](../extension/README.md).
- **Fork streak restore:** when `gh api …/artifacts` lacks permission on forks, privacy-prod falls back to `gh run download -n soft-live-hash-streak` (documented dry-run: `scripts/assert-soft-live-fork-fallback.mjs`).
- Extension UI unpark (`scripts/assert-extension-ui-unpark.mjs`) is **soft** on PRs until repo var `EXT_UI_UNPARK_HARD=1`.
  - **Flip rule:** set `EXT_UI_UNPARK_HARD=1` **only** after Privacy prod **schedule** Job Summary shows `streak=3/3 extension-ui=unpark` (three consecutive greens; inview soft-fail resets). Do **not** flip from a single PR run or from committed baseline `streak=0`. Artifact retention becomes **90 days** when hard. Hard unpark also writes a PR check `::notice::` linking the run’s `soft-live-hash-streak` artifact + Job Summary bullet.
  - **Flip checklist:** (1) open latest schedule Privacy prod Summary → confirm `streak=3/3`; (2) `gh variable set EXT_UI_UNPARK_HARD --body 1`; (3) record UTC date below; (4) dry-run refuse: `node scripts/assert-ext-ui-unpark-hard-ready.mjs` (exits 0 only when env/artifact streak≥3).
  - **Flip date:** _not yet_ — awaiting three consecutive greens after soft-live streak wiring (`621c606`, 2026-11-23). Record here when set: `EXT_UI_UNPARK_HARD flipped YYYY-MM-DD` (leave blank until then).
- Soft-live chart history CSV: privacy-prod appends `ci/soft-live-chart-history.csv` (artifact `soft-live-chart-history`) across schedule runs — see `scripts/append-soft-live-chart-history.mjs`.
- Soft CI step **`Soft China wrap + /api/geo`**: runs `scripts/soft-china-redirect-probe.mjs` (**staging then prod** via `STAGING_HEALTH_URL` / `PRODUCTION_HEALTH_URL`). Asserts wrap header + `cfCountry` + `wrapHints.runWorkerFirst`. Does **not** assert CN→Pages 302 (ubuntu is rarely `CF=CN`). Real CN sample / Logpush: `302` + `ClientCountry=CN` + Location→`otas0.github.io`.
- Deploy must run `wrap-worker-china-cf-redirect.mjs` then `--check` (`main=china-cf-entry.js`, `assets.binding=ASSETS`, vinext `run_worker_first` pattern) before `wrangler deploy`. Prefer **staging** before production when changing the wrap.
- **Workers version scrapbook (rollback):**
  - `65e336c7-39dd-4545-b165-e3e2cd9b219d` — 2026-11-25T03:56Z — first china-cf-entry wrap on prod (CN via `request.cf.country`)
  - `9afb5e10-3ba7-4cc5-902a-c8e2018f6cc0` — 2026-11-25T04:08Z — staging wrap harden (`x-buusdocst-china-wrap`, CN-only, `/api/geo` rateNote)
  - `9dc3ff3c-6338-49d3-9ba4-5a16f2503ccf` — 2026-11-25T04:10Z — prod promote of same wrap harden (`6236fcb`)
  - `0ed5b2b8-ff77-40bd-9adb-e59834f73f4d` — 2026-11-25T09:16Z — staging `run_worker_first=true` (`a2faadb`)
  - `39c96aca-aa53-46b5-806b-789b0868f14a` — 2026-11-25T09:17Z — prod `run_worker_first=true` + client hard fallback (`a2faadb`)
  - `b43e4a94-d04c-402a-96f0-b8ac3b23713b` — 2026-11-28T07:20Z — prod (pre client zh-CN harden; wrap live, JP sample)
  - Record newer IDs here after each China-redirect-related prod / staging deploy.

- Optional Playwright job also runs on **schedule** (nightly) and includes `test:playwright:extension-china-stay-clear`.
- Nightly: `smoke:privacy-china` (zh-Hans · EN · pt-PT) via **Production health smoke** (05:20 UTC; Step Summary prints `smoke:privacy-china=<UTC>`) and **Health monitor** (checklist notes + `CHECKLIST_LOG_MAX_ROWS` cap, default 40 — see [CHECKLIST_CI_WRITE.md](CHECKLIST_CI_WRITE.md)); privacy-prod Playwright via **Privacy prod smoke** (05:45 UTC; failure uploads `privacy-prod-playwright-report`).
