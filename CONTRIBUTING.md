# Contributing

**Website = check only; extension / desktop = personal block & trust** (`shield-lists-v1` JSON). Never reintroduce website block storage.

Local website: `npm run dev` → **http://localhost:3000**. Connection refused on `:3001` → try `:3000` or start `npm run dev` (`npm run dev:3001` if you need the old port). Smoke: `npm run health:smoke`. See the **Local ports** table in [README.md](README.md#local-ports).

vinext/Sites may block writes to `.env.local` (EPERM). Settings MERGE_PT / probe-budget still hot-apply in-process; persistence may use `security/data/runtime/env-overrides.env` (gitignored). Session override alone is enough for local toggles.

Optional Playwright base URL override (CI job `settings-screenshot`): repository variable `PLAYWRIGHT_BASE_URL` (default `http://localhost:3000`). If it still contains `:3001`, CI posts a soft notice — prefer `:3000`.

## Branch protection (maintainers)

Require the **`evaluation-diff`** status check on `main`:

1. Resolve the repo slug, then open branch settings:

   ```bash
   owner_repo=$(gh repo view --json nameWithOwner -q .nameWithOwner)
   # macOS
   open "https://github.com/${owner_repo}/settings/branches"
   # Linux
   xdg-open "https://github.com/${owner_repo}/settings/branches"
   # Windows (cmd / PowerShell)
   start "https://github.com/${owner_repo}/settings/branches"
   # or: explorer "https://github.com/${owner_repo}/settings/branches"
   ```

   Manual URL shape: `https://github.com/<owner>/<repo>/settings/branches`

2. Edit the protection rule → **Require status checks to pass before merging** → add **`evaluation-diff`** (and optionally **`quality`**).
3. The check name appears in the picker only after CI has run once on the default branch.

Screenshot tip: type `evaluation-diff`, wait for the suggestion, tick it, Save.

## OpenAPI / timing schema sync

Canonical files live under `docs/` only — edit `docs/openapi-check-timing.yaml`, `docs/check-timing.schema.json`, and `docs/API_CHECK_CONTRACT.md`, then sync. **Never hand-edit** `extension/shared/openapi-check-timing.yaml`, `extension/shared/check-timing.schema.json`, or `extension/shared/API_CHECK_CONTRACT.md`.

```bash
npm run openapi:sync    # copies OpenAPI + schema + API_CHECK_CONTRACT.md → extension/shared
npm run contract:sync   # contract-only copy (same destination)
npm run openapi:check   # cmp all three — also run in CI quality job
```

**OpenAPI is 1.5.2** (`accountSyncEnabled` on `/api/health`). Do not bump the patch for docs-only or timing-only edits. When health optional fields grow again (and only then): bump OpenAPI `info.version` patch in the **same PR** as `HEALTH_JSON_ALLOWLIST` + named `timingSchemaFail*` asserts, then `openapi:sync`. Edit `docs/API_CHECK_CONTRACT.md` only — never hand-edit `extension/shared/`. PR checklist: [`.github/pull_request_template.md`](.github/pull_request_template.md).

A project Cursor hook (`.cursor/hooks/openapi-check.sh`) runs **`npm run openapi:check` on every `git commit`**.  
Also install the git hook path once: `npm run hooks:install` (uses `.githooks/pre-commit`).


### Desktop scan-resources smoke

From repo root: `npm run smoke:desktop-scan-resources`. Fixture assert messages use `countFixtureLines` / `fixtureStringLength` in [`desktop-app/public/js/scan-resources-session.mjs`](desktop-app/public/js/scan-resources-session.mjs) (same helpers as the Scan resources QA table in [`desktop-app/README.md`](desktop-app/README.md)). Timing contract for desktop website-check: [`desktop-app/TIMING_SCHEMA.md`](desktop-app/TIMING_SCHEMA.md).

CI quality greps that `extension/popup/popup.js` imports `API_BASE_FALLBACK_NOTICE_KEY` from `shared/api-base-fallback.mjs` and never hardcodes `websiteApiBaseFallbackNotice`.

## Optional Playwright Settings screenshot

Enable the optional CI job:

```bash
gh variable set RUN_PLAYWRIGHT_SETTINGS --body true
```

CI caches Playwright browsers under `~/.cache/ms-playwright` (with `restore-keys` for warm OS caches) and does **not** install ImageMagick — thumbnails come from `scripts/png-max-width.mjs`. If the thumb helper fails but the full PNG exists, the optional job stays green, uploads the PNG, and posts a notice.

## Threat batches

- Core list: `npm run threat:apply -- security/data/batches/….json` (template: `_template.json`)
- Portugal seeds: `npm run threat:apply -- … --target=pt` (template: [`security/data/batches/_template.pt.json`](security/data/batches/_template.pt.json) with `"target": "curated-threats.pt.json"`)
- Preview without write: `npm run threat:apply -- … --dry-run`  
  `--dry-run` **skips** the `readyToApply` / `reviewedBy` checklist on purpose so operators can preview diffs before sign-off. Validation failures still exit non-zero (same as a real apply).

### PT merge env (`OWN_THREAT_MERGE_PT`)

Settings can write `OWN_THREAT_MERGE_PT` to `.env.local` (local hot-read). For list edits use the PT template above, then `npm run evaluate` (EVAL-029–032). `--target=pt` is rejected when the batch JSON `"target"` points at the core list (and the reverse).

## Fixture smoke

```bash
npm run evaluate:diff:smoke   # expect exit 1
```