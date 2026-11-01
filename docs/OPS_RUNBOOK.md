# Ops runbook (Preventive Shield · Cloudflare)

Short operator procedures after the first Workers deploy.

## Origins & variables

| Variable / file | Purpose |
|-----------------|--------|
| `NEXT_PUBLIC_SITE_URL` | Deploy build public origin (Actions variable; Deploy workflow defaults to workers.dev) |
| `PRODUCTION_HEALTH_URL` | Health + check:prod monitor target (defaults to same workers.dev if unset) |
| `shared/production-site.json` | Extension / desktop client default after `npm run production:origin` |
| [PUBLIC_PROMOTION.md](PUBLIC_PROMOTION.md) | Only links allowed in public posts |

After a **custom domain**: update both GitHub variables, re-run `production:origin`, redeploy, and rewrite PUBLIC_PROMOTION — see [CUSTOM_DOMAIN_REDEPLOY.md](CUSTOM_DOMAIN_REDEPLOY.md).

## Checklist CI write-back

**Production health** appends rows to `docs/LAUNCH_CHECKLIST.md` and pushes with `GITHUB_TOKEN` (`contents: write`).

| Control | Effect |
|---------|--------|
| *(unset)* / any value except `0` | Bot commit + push enabled |
| **`CHECKLIST_CI_WRITE=0`** | **Disable** checklist commits (use when the default branch is protected against the Actions bot, or to stop noisy commits) |

Verify bot can write: [CHECKLIST_CI_WRITE.md](CHECKLIST_CI_WRITE.md).

## Alerts

- GitHub workflow-failure email → Watch repo ([HEALTH_ALERTS.md](HEALTH_ALERTS.md))
- Optional Slack → secret `SLACK_WEBHOOK_URL`; test via Actions → **Slack alert test**
- Cloudflare Workers error/CPU email → [CLOUDFLARE_ALERTS.md](CLOUDFLARE_ALERTS.md)

## Do not open early

- Account sync → [ACCOUNT_SYNC_GATE.md](ACCOUNT_SYNC_GATE.md) (Turso + Resend first)
- vinext 1.4 → only after 48h freeze → `chore/vinext-1-4-eval` ([VINEXT_UPGRADE_1_4.md](VINEXT_UPGRADE_1_4.md))

## Baselines & connectivity

- Workers metrics PNGs → [WORKERS_ERROR_BASELINE.md](WORKERS_ERROR_BASELINE.md)
- Laptop cannot reach workers.dev → [LOCAL_CF_CONNECTIVITY.md](LOCAL_CF_CONNECTIVITY.md) (not an outage by itself)
