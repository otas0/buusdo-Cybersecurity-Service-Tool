# Check timing schema (desktop)

When the desktop app calls the same first-party check API as the website, validate `analysis.timing` against the shared schema:

- [`docs/check-timing.schema.json`](../docs/check-timing.schema.json)
- OpenAPI fragment: [`docs/openapi-check-timing.yaml`](../docs/openapi-check-timing.yaml)

Runtime helper: [`src/validate-timing.js`](src/validate-timing.js)  
Proxy route: `POST /api/website-check` → `{WEBSITE_CHECK_URL}/api/check` (default `http://localhost:3000`), returns `timingValid: true` only when schema passes.

Do not add third-party reputation APIs. Reuse the website contract in [`docs/API_CHECK_CONTRACT.md`](../docs/API_CHECK_CONTRACT.md).

### Scan resources smoke (related)

Privacy-gated Scan resources fixtures (same-brand YouTube/Snapchat) are covered by `npm run smoke:desktop-scan-resources`. Assert failure messages include fixture string lengths via `countFixtureLines` / `fixtureStringLength` in [`public/js/scan-resources-session.mjs`](public/js/scan-resources-session.mjs) — see the QA table in [`README.md`](README.md).