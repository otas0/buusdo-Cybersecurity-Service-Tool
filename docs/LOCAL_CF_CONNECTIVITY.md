# Local Cloudflare connectivity (do not misread timeouts)

## What happened (2026-11-01)

From some operator networks (e.g. Asia laptop), HTTPS to:

`https://pcpd.mtsu.workers.dev`

**TCP connect timed out** (`curl` exit 28, Node/Python `fetch`/`urlopen` timeout).

At the same time:

- `wrangler deploy` / `wrangler whoami` succeeded (Cloudflare API path OK)
- Remote fetch of `GET /api/health` returned `ok` + `curatedListPresent: true`
- Privacy HTML for `/en/privacy` and `/pt-PT/privacy` loaded remotely
- `GET /api/check` returned **405** (expected — route is POST-only)

**Conclusion:** a local timeout is usually **client → `*.workers.dev` path blocked or filtered**, not a dead Worker. Do not roll back or redeploy solely because the laptop cannot open the origin.

## How to confirm the Worker is alive

1. Phone hotspot / travel VPN / GitHub Actions `ubuntu-latest` (Production health / Deploy workflows).
2. Cloudflare dashboard → Workers → **pcpd** → Metrics (requests rising).
3. From a reachable host:
   ```bash
   npm run health:prod -- --url https://pcpd.mtsu.workers.dev
   npm run check:prod -- --url https://pcpd.mtsu.workers.dev
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

**If the laptop cannot open `*.workers.dev` or `github.com` git HTTPS:** verify production only via GitHub Actions → **Production health** (ubuntu is CF-reachable). Do not treat local `curl` timeouts as Worker outages. Prefer [GIT_SSH_SETUP.md](GIT_SSH_SETUP.md) for git when HTTPS:443 is filtered.

## Operator rule (detail)


Treat **remote health OK + local timeout** as a **connectivity** issue. Fix the network or use CI smoke; only escalate as an outage when health fails from a known-good runner.