# Health / check:prod failure alerts

Workflow: [.github/workflows/health-monitor.yml](../.github/workflows/health-monitor.yml)

## Email (built-in)

1. GitHub → your avatar → **Settings** → **Notifications** → Actions → enable email on workflow failures.
2. Or watch the repository (**Watch** → **Custom** → Actions).

When **Production health** fails, GitHub emails subscribed watchers. No extra secret required.

**Status (2026-11-01):** Repo subscription for `otas0` is **on** (`subscribed: true`). Confirm the account’s **Settings → Notifications → Actions** still includes workflow failures (cannot set that toggle via API without `user` scope).

## Slack (optional)

1. Create an Incoming Webhook for your ops channel.
2. Repo → Settings → Secrets → Actions → `SLACK_WEBHOOK_URL`.
3. On failure the workflow POSTs a short text payload with the run URL.

## Checklist write-back

Successful/failed CI runs append a row under `docs/LAUNCH_CHECKLIST.md` § check:prod log and push (bot commit).  
Set repository variable `CHECKLIST_CI_WRITE=0` to disable the push.
