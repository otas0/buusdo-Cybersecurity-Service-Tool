## Summary

-

## Evaluation artifact (PR compare)

CI uploads `evaluation/results/evaluation-results.json` as the **evaluation-results** artifact on every run (including failed jobs when the file exists).

On pull requests, the required job **`evaluation-diff`** downloads the `evaluation-results` artifact from `main`, runs `npm run evaluate:diff`, posts a sticky Markdown table comment (ids + names), and **fails the check** (exit 1) if any scenario newly failed.

### Branch protection (required) — maintainer note

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full steps. Quick open (after `gh auth`):

```bash
owner_repo=$(gh repo view --json nameWithOwner -q .nameWithOwner)
open "https://github.com/${owner_repo}/settings/branches"   # macOS; or xdg-open / browser
```

Require status check **`evaluation-diff`** (exact job `name` in [`.github/workflows/ci.yml`](.github/workflows/ci.yml)). Optionally also require **`quality`**.

Screenshot tip: after typing `evaluation-diff`, wait for the check to appear in the suggestions list (it only lists checks that have run at least once) → tick it → Save.

### Fixture smoke (local / CI quality job)

```bash
npm run evaluate:diff:smoke
```

Uses [`evaluation/fixtures/`](evaluation/fixtures/) so `EVAL-SMOKE-001` is newly failed. Expects **exit 1** and writes `evaluation/diff.md`. The quality CI job inverts that exit (fails the job if smoke does not exit 1). Missing `diff.md` after exit 1 is a soft warning only.

OpenAPI / schema copies must match: `npm run openapi:check` (or `npm run openapi:sync` after editing `docs/`).

- [ ] OpenAPI patch bump only with a real new `/api/health` optional field (same PR as allowlist + named `timingSchemaFail*` + `openapi:sync`). See [CONTRIBUTING.md](CONTRIBUTING.md).

Optional Playwright narrow Settings screenshot: set repo variable `RUN_PLAYWRIGHT_SETTINGS=true` (thumb via `scripts/png-max-width.mjs`, no ImageMagick).

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

### PT threat batch

High-signal PT hosts (applied via `--target=pt`) live in `curated-threats.pt.json`. New PT batches:

```bash
npm run threat:apply -- security/data/batches/your-pt-batch.json --target=pt
```

EVAL-029 / EVAL-030 cover `autenticacao-gov.example` with MERGE_PT on/off. Exercise Settings MERGE_PT write on a local draft PR after list changes.

## Test plan

- [ ] `npm run test`
- [ ] `npm run evaluate`
- [ ] `npm run threat:check`
- [ ] `npm run evaluate:diff:smoke` (expect exit 1)
- [ ] `npm run openapi:check`
- [ ] OpenAPI stays **1.5.2** unless this PR adds a real new `/api/health` field
- [ ] Manual: check page idle shows `probeTimeoutMs` from `/api/health`