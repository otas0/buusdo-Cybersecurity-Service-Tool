# Health / check:prod failure alerts

Workflow: [.github/workflows/health-monitor.yml](../.github/workflows/health-monitor.yml) (Actions name: **Health monitor**). Thin alternate: **Production health smoke** (no soft_warn Slack).

## Email (built-in)

1. GitHub → your avatar → **Settings** → **Notifications** → Actions → enable email on workflow failures.
2. Or watch the repository (**Watch** → **Custom** → Actions).

When **Health monitor** fails, GitHub emails subscribed watchers. No extra secret required.

**Status (2026-11-01):** Repo subscription for `otas0` is **on** (`subscribed: true`). Confirm the account’s **Settings → Notifications → Actions** still includes workflow failures (cannot set that toggle via API without `user` scope).

## Slack (optional)

1. Create an Incoming Webhook for your ops channel.
2. Repo → Settings → Secrets → Actions → `SLACK_WEBHOOK_URL` (missing today → soft_warn exits `skipped-no-webhook`).
   ```bash
   gh secret set SLACK_WEBHOOK_URL --repo otas0/preventive-cybersecurity-prototype
   # paste webhook URL, then:
   gh workflow run "Health monitor" --repo otas0/preventive-cybersecurity-prototype -f force_soft_slack=true
   ```
3. On **health/check failure** the workflow POSTs a short text payload with the run URL (failure alert).
4. On **soft desktop download HEAD warnings** (count > 0, including notarized HEAD ≠ 200) the workflow POSTs an **information notice only** — the job stays green; this is not a page. Body includes RELEASE promote hint when notarized kind is `http-404` (`desktop-app/RELEASE.md` steps 2-3). Notices are **rate-limited to once per hour** when `soft_warn` is unchanged (cache key); a changed warn count always notifies. When skipped, the job summary includes `rateLimited=true`. Workflow_dispatch **force_soft_slack** bypasses the rate limit for ops drills. If `SLACK_WEBHOOK_URL` is unset, the summary still records `rateLimited=false|skipped-no-webhook`.

### Soft_warn rate-limit drill (after webhook is set)

```bash
# 1) Force a notice (bypasses 1h gate) — expect summary rateLimited=false
gh workflow run "Health monitor" --repo otas0/preventive-cybersecurity-prototype -f force_soft_slack=true
# 2) Within 1h, dispatch again WITHOUT force — expect summary rateLimited=true (same soft_warn)
gh workflow run "Health monitor" --repo otas0/preventive-cybersecurity-prototype
```

**Do not confuse workflows:** **Health monitor** = soft_warn + Slack + notarized HEAD + checklist write-back. **Production health smoke** = thin `/api/health` + `/api/check` only (no soft_warn Slack path).

## Checklist write-back

Successful/failed CI runs append a row under `docs/LAUNCH_CHECKLIST.md` § check:prod log and push (bot commit).  
Set repository variable `CHECKLIST_CI_WRITE=0` to disable the push.