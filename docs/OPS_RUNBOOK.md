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

Checklist **Notes** column format (Production health OK rows):

`health+check · softDownloadWarn=<n> · notarized=<missing|ok|http-404|…> · <run_url>`

Sample (healthy downloads):

`health+check · softDownloadWarn=0 · notarized=ok · https://github.com/…/actions/runs/…`

When soft Slack is skipped inside the 1h window, the Actions job summary includes `rateLimited=true` (notice-only; checklist Notes still use the format above). Ops drill: workflow_dispatch **force_soft_slack** bypasses that limit. Unset webhook → summary `rateLimited=false|skipped-no-webhook`.

See [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) § check:prod log.

## Alerts

- GitHub workflow-failure email → Watch repo ([HEALTH_ALERTS.md](HEALTH_ALERTS.md))
- Optional Slack → secret `SLACK_WEBHOOK_URL`; test via Actions → **Slack alert test**
- Soft desktop download HEAD warnings (including notarized missing vs 404) → Slack **notice-only** (job stays green; not a page); rate-limited to **one notice per hour** when the soft warn count is unchanged — [HEALTH_ALERTS.md](HEALTH_ALERTS.md)
- Cloudflare Workers error/CPU email → [CLOUDFLARE_ALERTS.md](CLOUDFLARE_ALERTS.md)

## Do not open early

- Account sync → [ACCOUNT_SYNC_GATE.md](ACCOUNT_SYNC_GATE.md) (Turso + Resend first)
- vinext 1.4 → only after 48h freeze → `chore/vinext-1-4-eval` ([VINEXT_UPGRADE_1_4.md](VINEXT_UPGRADE_1_4.md))

## Baselines & connectivity

- Workers metrics PNGs → [WORKERS_ERROR_BASELINE.md](WORKERS_ERROR_BASELINE.md)
- Laptop cannot reach workers.dev → [LOCAL_CF_CONNECTIVITY.md](LOCAL_CF_CONNECTIVITY.md) (not an outage by itself). **Ops default:** verify prod health only via Actions (ubuntu is CF-reachable); skip local `curl`/`health:prod` when TCP times out. Prefer workflow **Health monitor** (soft_warn + Slack RELEASE hint + checklist write-back). Use **Production health smoke** only for a thin CF `/api/health`+`/api/check` gate when you do not need soft_warn.
- Desktop packaging CI (2026-11-02): linux deb needs trailing newline on `DEBIAN/control`; windows `stage-nsis.sh` falls back without `rsync`; macos install-accept uses `SHIELD_MACHINE_SCAN_ROOT` tiny fixture (runner `$HOME` too large for first-open deadline).
- Notarized zip still 404 → soft_warn only; Slack/summary point at [desktop-app/RELEASE.md](../desktop-app/RELEASE.md) checklist steps 2–3 — do **not** run `desktop-promote-macos-url` until `NOTARIZED_HEAD_OK=1` / HEAD 200. Custom domain cutover stays hold until Account staging gate + [POST_LAUNCH_48H.md](POST_LAUNCH_48H.md) allow.
- Buusdo / other products → separate Cursor workspace / conversation; never `move_agent_to_root` here; never mix into this Shield PR.