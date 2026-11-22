# CI notes

- China soft-fail Playwright artifact name: **`china-soft-fail-playwright`** (uploaded from the optional Playwright Settings job after `npm run test:playwright:china-soft-fail`; Job Summary links this doc + `artifact-url` when upload succeeds).
- Nightly: `smoke:privacy-china` via **Production health smoke** (05:20 UTC; Step Summary prints `smoke:privacy-china=<UTC>`) and **Health monitor** (checklist notes + `CHECKLIST_LOG_MAX_ROWS` cap, default 40); privacy-prod Playwright via **Privacy prod smoke** (05:45 UTC; failure uploads `privacy-prod-playwright-report`).
