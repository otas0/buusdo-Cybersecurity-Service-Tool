# Local Cloudflare connectivity (do not misread timeouts)

## What happened (2026-11-01)

From some operator networks (e.g. Asia laptop), HTTPS to:

`https://buusdocst.mtsu.workers.dev`

**TCP connect timed out** (`curl` exit 28, Node/Python `fetch`/`urlopen` timeout).

At the same time:

- `wrangler deploy` / `wrangler whoami` succeeded (Cloudflare API path OK)
- Remote fetch of `GET /api/health` returned `ok` + `curatedListPresent: true`
- Privacy HTML for `/en/privacy` and `/pt-PT/privacy` loaded remotely
- `GET /api/check` returned **405** (expected — route is POST-only)

**Conclusion:** a local timeout is usually **client → `*.workers.dev` path blocked or filtered**, not a dead Worker. Do not roll back or redeploy solely because the laptop cannot open the origin.

## How to confirm the Worker is alive

1. Phone hotspot / travel VPN / GitHub Actions `ubuntu-latest` (Production health / Deploy workflows).
2. Cloudflare dashboard → Workers → **buusdocst** → Metrics (requests rising).
3. From a reachable host:
   ```bash
   npm run health:prod -- --url https://buusdocst.mtsu.workers.dev
   npm run check:prod -- --url https://buusdocst.mtsu.workers.dev
   ```
4. Log the result in [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) § check:prod log.

## Common causes

| Cause | Hint |
|-------|------|
| Corporate / ISP filter of Cloudflare edge | Timeout on `:443` to `*.workers.dev` IPs |
| Local HTTP(S) proxy that breaks tunnel | Wrangler may warn about proxy; `curl` still hangs |
| DNS resolves but SYN dropped | `dig`/`nslookup` OK; connect never completes |
| Worker actually down | Dashboard errors spike; remote fetch also fails |

## Operator rule (default)

**If the laptop cannot open `*.workers.dev` or `github.com` git HTTPS:** verify production **only** via GitHub Actions (**Health monitor** or **Production health smoke** — ubuntu is CF-reachable). Do not treat local `curl` timeouts as Worker outages; do not debug CF from this laptop when TCP times out. Prefer [GIT_SSH_SETUP.md](GIT_SSH_SETUP.md) for git when HTTPS:443 is filtered.

## Operator rule (detail)

Treat **remote health OK + local timeout** as a **connectivity** issue. Fix the network or use CI smoke; only escalate as an outage when health fails from a known-good runner.

## Staging (`buusdocst-staging`) — Actions-only assert when laptop times out

Same TCP filter often hits **staging** as production:

`https://buusdocst-staging.mtsu.workers.dev`

**If local `curl` / `npm run assert:staging-health` times out after a successful `wrangler deploy`:**

1. Do **not** redeploy solely for the timeout.
2. Confirm from GitHub Actions (ubuntu is Cloudflare-reachable):
   - Workflow **Deploy Cloudflare** (staging target) — post-deploy health step when `STAGING_HEALTH_URL` is set
   - Workflow **Health monitor** / **Production health smoke** — staging gate when `vars.STAGING_HEALTH_URL` is set
3. Laptop substitutes that stay valid without Workers reachability:
   ```bash
   # Privacy + contact/FAQ against local vinext (same copy as staging after deploy)
   PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:playwright:privacy
   npm run test:playwright:halt-survey
   ```
4. Log “deploy OK + local CF timeout + Actions assert” in the deploy notes — not as a Worker outage.

Actions-only checklist:

```bash
# On ubuntu-latest (CI), not on a filtered laptop:
STAGING_HEALTH_URL=https://buusdocst-staging.mtsu.workers.dev npm run assert:staging-health
PLAYWRIGHT_BASE_URL=https://buusdocst-staging.mtsu.workers.dev npm run test:playwright:privacy
```