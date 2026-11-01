# Confirm Actions bot can push checklist updates

The **Production health** workflow commits to the default branch after `check:prod`.

## Required repo settings

1. **Actions permissions** → Settings → Actions → General → Workflow permissions → **Read and write permissions** (so `GITHUB_TOKEN` can `git push`).
2. Allow GitHub Actions to create/approve PRs is **not** required for direct push.
3. If the default branch has **branch protection**:
   - Either allow `github-actions[bot]` to bypass / push, **or**
   - Set repository variable **`CHECKLIST_CI_WRITE=0`** and treat the Actions **Summary** + artifacts as the log of record (no bot commits).

## Verify (one manual run)

1. Ensure `CHECKLIST_CI_WRITE` is **not** `0`.
2. Actions → **Production health** → **Run workflow**.
3. Expect either:
   - Job green + a new commit `chore: log check:prod from CI (success)` on the default branch, **or**
   - Job green with “No checklist changes” if today’s OK row for that URL already exists.
4. If push fails with `refusing to allow a GitHub App to create…` / protected branch: set `CHECKLIST_CI_WRITE=0` and fix protection, or use a PAT secret `CHECKLIST_PUSH_TOKEN` (optional future).

## Kill switch (anti-spam)

```
Repository variable: CHECKLIST_CI_WRITE = 0
```

Documented in [OPS_RUNBOOK.md](OPS_RUNBOOK.md). Re-enable by deleting the variable or setting it to `1`.
