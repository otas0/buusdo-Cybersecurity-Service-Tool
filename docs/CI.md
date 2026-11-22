# CI notes

- China soft-fail Playwright artifact name: **`china-soft-fail-playwright`** (uploaded from the optional Playwright Settings job after `npm run test:playwright:china-soft-fail`; Job Summary links this doc + run artifacts).
- Nightly: `smoke:privacy-china` via **Production health smoke** (05:20 UTC) and **Health monitor** (checklist notes include `smoke:privacy-china=<UTC>`); privacy-prod Playwright via **Privacy prod smoke** (05:45 UTC, CF-reachable ubuntu; failure uploads `privacy-prod-playwright-report`).
