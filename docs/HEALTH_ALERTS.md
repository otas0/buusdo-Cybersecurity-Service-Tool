# Health / check:prod failure alerts

Workflow: [.github/workflows/health-monitor.yml](../.github/workflows/health-monitor.yml) (Actions name: **Health monitor**). Thin alternate: **Production health smoke** (no soft_warn Slack).

## Email (built-in)

1. GitHub → your avatar → **Settings** → **Notifications** → Actions → enable email on workflow failures.
2. Or watch the repository (**Watch** → **Custom** → Actions).

When **Health monitor** fails, GitHub emails subscribed watchers. No extra secret required.

**Status (2026-11-01):** Repo subscription for `otas0` is **on** (`subscribed: true`). Confirm the account’s **Settings → Notifications → Actions** still includes workflow failures (cannot set that toggle via API without `user` scope).

## Slack — skipped

**Decision (2026-11-07):** do **not** configure `SLACK_WEBHOOK_URL`. Product ops uses GitHub Actions email / repository Watch only. Soft_warn jobs exit `skipped-no-webhook` — that is expected, not a launch blocker.

Notarized HEAD soft_warns are also expected while the ship channel stays on the **unsigned** GitHub zip ([DESKTOP_SETUP_GUIDE.md](DESKTOP_SETUP_GUIDE.md)).

**Do not confuse workflows:** **Health monitor** = soft_warn + optional Slack + download HEAD + checklist write-back. **Production health smoke** = thin `/api/health` + `/api/check` only.

## Checklist write-back

Successful/failed CI runs append a row under `docs/LAUNCH_CHECKLIST.md` § check:prod log and push (bot commit).  
Set repository variable `CHECKLIST_CI_WRITE=0` to disable the push.