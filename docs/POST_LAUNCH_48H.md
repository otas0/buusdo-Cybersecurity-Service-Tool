# Post-launch freeze (first 48 hours)

After the first successful Cloudflare deploy that you treat as **live**:

## Do

1. Set the origin: `npm run production:origin -- https://YOUR.workers.dev` (or custom domain), commit the README / client defaults.
2. Confirm `npm run health:prod -- --url …` → `curatedListPresent: true`, `accountSyncEnabled: false`.
3. Confirm `npm run check:prod -- --url …` → timing-valid analysis (Workers outbound fetch + probe).
4. Keep Cloudflare error / CPU alert emails on ([CLOUDFLARE_ALERTS.md](CLOUDFLARE_ALERTS.md)).
5. Keep GitHub **Production health** green (`PRODUCTION_HEALTH_URL`).
6. Spot-check `/en`, `/pt-PT`, `/en/privacy`, `/pt-PT/privacy`.
7. Prefer **one canonical host** (apex **or** www) — see [CANONICAL_HOST.md](CANONICAL_HOST.md).

## Do not (for 48h)

- Enable account sync / Turso / mailer mid-incident window
- Land large new product surfaces (new check modes, redesigns, extension-major features)
- Parallel “nice to have” refactors that touch `/api/check` or probe budgets

Small hotfixes for health, check, or privacy copy are OK.

## After 48h

Re-open the normal backlog (Turso gate for account sync, vinext 1.4 eval, extension polish) using [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) leftovers.