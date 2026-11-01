# Evaluate vinext 1.4 + React 19.3 (official deploy CLI)

## Current (this repo)

| Package | Version |
|---------|---------|
| `vinext` | `1.0.0-beta.3` |
| `react` / `react-dom` | `19.2.6` |
| Deploy | `npm run deploy:cloudflare` → `vinext build && wrangler deploy` |

Official `@vinext/cloudflare` peer range wants **`vinext ^1.4`** and **`react ^19.3`**. Installing it today fails peer checks — keep the wrangler path until an intentional upgrade.

## When to upgrade

- After the first 48h freeze ([POST_LAUNCH_48H.md](POST_LAUNCH_48H.md))
- On a branch, not mid-incident
- When release notes for vinext 1.4 confirm Workers + App Router parity with our routes (`/api/check`, `/api/health`, account-sync off)

## Suggested trial steps

```bash
# branch only
npm install vinext@^1.4 react@^19.3 react-dom@^19.3 react-server-dom-webpack@^19.3
npm install -D @vinext/cloudflare
npm run check
npm run deploy:cloudflare:dry
# optional: switch package script to `npx @vinext/cloudflare deploy` if dry-run + smoke pass
```

## Acceptance

- [ ] `npm run check` green
- [ ] Local `POST /api/check` timing schema valid
- [ ] Workers deploy smoke: `health:prod` + `check:prod`
- [ ] `curatedListPresent: true` still true (static JSON import)

## If blocked

Stay on `vinext build && wrangler deploy`. Document the blocker (peer conflict, RSC regression, probe timeout) in the PR — do not force `@vinext/cloudflare` on the production script until acceptance passes.