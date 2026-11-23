# CI notes

- China soft-fail Playwright artifact name: **`china-soft-fail-playwright`** (uploaded from the optional Playwright Settings job after `npm run test:playwright:china-soft-fail`; Job Summary links this doc + `artifact-url`; self-check fails if both `artifact-url` and `artifact-id` are empty after a successful upload). Upload uses `if-no-files-found: error` — empty report/test-results fails the job.
- Extension clear-stay harness: on failure, uploads **`extension-china-stay-clear-playwright`** (Playwright report / test-results) for nightly triage.
- Health monitor checklist append emits `dropped_rows` (cap via `CHECKLIST_LOG_MAX_ROWS`) into the Job Summary and a `::notice::DROPPED_ROWS=N` annotation for Actions search.
- Soft-live hash streak: **Privacy prod smoke** restores the prior `soft-live-hash-streak` artifact, bumps via `scripts/bump-soft-live-hash-streak.mjs`, uploads again. Committed `ci/soft-live-hash-streak.json` stays at streak=0 baseline.
- Extension UI unpark (`scripts/assert-extension-ui-unpark.mjs`) is **soft** on PRs until repo var `EXT_UI_UNPARK_HARD=1` after schedule proves streak≥3.
- Optional Playwright job also runs on **schedule** (nightly) and includes `test:playwright:extension-china-stay-clear`.
- Nightly: `smoke:privacy-china` (zh-Hans · EN · pt-PT) via **Production health smoke** (05:20 UTC; Step Summary prints `smoke:privacy-china=<UTC>`) and **Health monitor** (checklist notes + `CHECKLIST_LOG_MAX_ROWS` cap, default 40 — see [CHECKLIST_CI_WRITE.md](CHECKLIST_CI_WRITE.md)); privacy-prod Playwright via **Privacy prod smoke** (05:45 UTC; failure uploads `privacy-prod-playwright-report`).
