# Public deployment notes V0.1 (historical)

## Target

Cloudflare Workers (current) or Vercel for Next.js preview. No database, authentication, analytics, or paid third-party threat API is required for the core check flow.

## Environment

The first-party curated threat list is the safe application default. No API key should be configured for fictional reputation providers.

`NEXT_PUBLIC_SITE_URL` is optional. When absent, production metadata uses the deployment host.

## Required routes

`/{locale}`, `/{locale}/settings`, `/{locale}/privacy`, and `/{locale}/lists-offline` are handled by the Next.js App Router and support direct navigation and refresh. There is no `/teacher-demo` product route.

## Safety

Local protection choices remain in browser-local storage. No secrets, personal visitor information, analytics, telemetry, credential processing, or third-party reputation API calls are required for the core Halt path.

## Verification

```bash
npm run evaluate
npm run test
npm run typecheck
npm run lint
npm run build
```

Post-deploy Europe locale smoke:

```bash
PLAYWRIGHT_LIVE_BASE_URL=https://buusdocst.mtsu.workers.dev npm run assert:eu-locale-routes-200
```
