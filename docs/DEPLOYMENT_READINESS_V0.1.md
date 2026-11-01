# Deployment Readiness V0.1

Historical V0.1 note. For **product launch**, use [PRODUCTION_HOSTING.md](PRODUCTION_HOSTING.md) and [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

## Environment

Copy `.env.example` to `.env.local`. Local mode requires no secret. Any future provider key must be configured in the hosting environment and never committed.

## Release checklist

1. Run `npm ci` on Node.js 22.13 or newer.
2. Run `npm run check`.
3. Manually verify `/en`, `/pt-PT`, settings reversal, and a mobile viewport.
4. Confirm first-party threat intel only (`threatIntel: own` on `/api/health`).
5. Confirm metadata, HTTPS hosting, security headers (`vercel.json`), and privacy copy.

Default production path is **Cloudflare Workers**: `npm run deploy:cloudflare`, set `NEXT_PUBLIC_SITE_URL`, attach a custom domain, then `npm run health:prod -- --url https://…`. See [PRODUCTION_HOSTING.md](PRODUCTION_HOSTING.md). Do not add production keys to the repository.