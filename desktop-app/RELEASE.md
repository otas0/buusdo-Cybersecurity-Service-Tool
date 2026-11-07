# buusdo desktop — release notes (MVP)

**TOC:** [Verify before ship](#verify-before-ship)
- [First-open DOM smoke](#first-open-dom-smoke)
- [Account field contrast (Playwright)](#account-field-contrast-playwright)
- [Focus-gate fixture overrides](#focus-gate-fixture-overrides)
- [Listing keep-temp](#listing-keep-temp)
- [Home-continue stamp sync](#home-continue-stamp-sync)
- [CI STRICT run-name](#ci-strict-run-name)
- [Packaging](#packaging)
- Desktop settings contract: [`docs/DESKTOP_SETTINGS_CONTRACT.md`](../docs/DESKTOP_SETTINGS_CONTRACT.md) (`honestLimitsAckAt` on GET/PUT)

## What this release does

- Scans this computer as far as the signed-in user can read.
- Asks a real yes/no for **maximum block**.
- On yes: adds hosts to the personal block list and quarantines **user-owned** files only.
- Enforces blocked hosts on the local HTTP proxy (`127.0.0.1:8080`).
- On no: leaves files in place; does not re-ask for the same finding set.
- Restore puts quarantined files back and removes hosts this scan added.

## Honest limits (always)

- **No TLS decryption** — HTTPS CONNECT is hostname-only; there is no MITM CA.
- **No process kill** — running programs keep running.
- **System directories are report-only** — `/usr`, `/etc`, Windows system paths, Program Files, etc. are never moved or edited.
- **No AV / signature engine** and no credential or browsing-history capture.
- Privacy default: never store the checked address.

## Install / first open

- Silent install does **not** enable open-at-login.
- First open shows an **honest limits** confirm (ack → scan, skip → idle, reversible via “Show honest limits again”). Smokes may set `SHIELD_HONEST_LIMITS=0`.
- Dashboard explains how to point OS/browser HTTP proxy at `127.0.0.1:8080` (otherwise the block log stays quiet).
- Footer **Export diagnostics** writes a URL-free JSON snapshot into the data folder.
- Data lives under the user data directory (see `PACKAGING.md`), not inside the app bundle.

## Verify before ship

### Smoke env

| Variable | Value | Why |
| --- | --- | --- |
| `SHIELD_QUIT_GRACE_MS` | `0` | Faster quit in smokes / `npm run mvp` |
| `SHIELD_HONEST_LIMITS` | `0` | Bypass first-open honest-limits gate in machine/UI smokes (never set in production installers) |

```bash
# Repo root — temp fixtures only (never quarantines the real home)
SHIELD_QUIT_GRACE_MS=0 npm run mvp

# Desktop check loop (proxy, install-accept, launcher quit, health yml, reveal, notarized-404)
npm run check:desktop
```

### First-open DOM smoke

```bash
# Also part of npm run mvp — skip primary, proxy OS, Export outline/copy/reveal, PUT honestLimitsAckAt,
# Show proxy guide + sessionStorage closed flag, Scan again aria-live primary
npm run smoke:desktop-first-open
```

```bash
# Quarantine restore strings EN + pt-PT (destination-exists / missing / failed)
npm run smoke:desktop-quarantine-i18n

# Read-only home progress only — do NOT click Block all on a developer machine
npm run smoke:desktop-home-continue

# Website: Settings → honest limits stays SPA (needs PLAYWRIGHT_BASE_URL)
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:playwright:honest-limits

# Desktop: honest-limits ack leaves #machineStatus waiting copy
npm run test:playwright:desktop-honest-limits

# Quarantine restore-error :focus-visible Halt outline (no website server)
npm run test:playwright:quarantine-focus

# Mirror-stale + notarized-404 soft fixtures (no network) — typecheck / check:desktop
npm run verify:desktop-downloads:fixture
npm run verify:desktop-downloads:fixture:notarized-404

# Export diagnostics :focus-visible Halt outline (no website server)
npm run test:playwright:diagnostics-focus

# Desktop settings GET/PUT contract (honestLimitsAckAt preserved)
# → docs/DESKTOP_SETTINGS_CONTRACT.md (also linked from TOC above)

# Windows Authenticode (when a local PFX path is present) — mirrors CI WIN_CERT_REQUIRE=1
# WIN_CERT_REQUIRE=1 signtool verify /pa desktop-app/dist/windows/PreventiveShield-Setup-User.exe
```

### Account field contrast (Playwright)

```bash
# Account + listDomain: no white fill, light type, Halt :focus-visible (no desktop server)
npm run test:playwright:desktop-account-fields
```

- CI STRICT: see [CI STRICT run-name](#ci-strict-run-name) (child of Verify before ship — mid-job `run-name` rename is impossible).

### Focus-gate fixture overrides

Unit tests only — never set in production CI/runtime. Never set / export `SHIELD_FOCUS_GATE_*` in Actions env.

- Per-file: `SHIELD_FOCUS_GATE_INDEX_HTML`, `SHIELD_FOCUS_GATE_OPS_HTML`
- Single dir: `SHIELD_FOCUS_GATE_FIXTURE_DIR=tests/fixtures/focus-gate-bad/` (expects `index.html` + `home-continue-timeline.html`)
- Example: `SHIELD_FOCUS_GATE_FIXTURE_DIR=tests/fixtures/focus-gate-bad node scripts/assert-dashboard-no-bare-focus.mjs`
- Tests: `tests/focus-gate-bare-focus.test.ts`

### Listing keep-temp

```bash
SHIELD_LISTING_KEEP_TEMP=1 node scripts/assert-listing-honest-limits.mjs
# → keeps tests/fixtures/listing-mirror-live-temp.json

# Keep then delete in the same run (CI / local tidy):
SHIELD_LISTING_KEEP_TEMP=1 SHIELD_LISTING_KEEP_TEMP_CLEAN=1 node scripts/assert-listing-honest-limits.mjs
```

- Local-only path: listed in **both** `.gitignore` and `.cursorignore` (debug keep-temp must not be committed or indexed by the agent).
- Do not commit `tests/fixtures/listing-mirror-live-temp.json`.

### Home-continue stamp sync

Edit `shared/home-continue-stamp.ts`, then:

```bash
npm run sync:home-continue-stamp
npm run sync:home-continue-stamp:check   # typecheck + .githooks/pre-commit (next to openapi:check)
```

Or edit three places: shared TS, `ops/home-continue-stamp.browser.js`, `tests/fixtures/home-continue-stamp-tag-only.html`.

### CI STRICT run-name

CI sets a dynamic `run-name` from the event / PR label only. **Mid-job rename is impossible** in GitHub Actions — when `STRICT_MAC_SOURCE_TITLE` is missing from Playwright `--list`, the failure is surfaced via annotations and a follow-up step named `STRICT_MAC_SOURCE_TITLE missing: …`, not by rewriting `run-name`.

Website Settings → Desktop downloads: `shared/desktop-downloads.json` (GitHub Release `desktop-v0.2.0` via workflow `desktop-release`). Prefer `buusdo-cybersecurity-service-tool-macos-app-notarized.zip` from `desktop-notarize-macos` on the same Release. After attach (HEAD 200), promote Settings primary with Actions → **desktop-promote-macos-url** (`--write-effective` + PR). Optional CDN mirrors live under `mirrors.*` after first publish if GitHub rate-limits. Privacy mirrors honest limits.

**Windows Authenticode:** once the org PFX is in GitHub secrets, set repo variable **`WIN_CERT_REQUIRE=1`** so CI `desktop-windows` and `desktop-release` refuse unsigned / skipped `signtool verify` (see `docs/DEPLOY_SECRETS.md`). Local check when a built installer exists: `WIN_CERT_REQUIRE=1 signtool verify /pa desktop-app/dist/windows/PreventiveShield-Setup-User.exe`.

Quarantine restore-error rows (dashboard): keyboard-only a11y — Tab to a restore-error row and confirm `:focus-visible` draws the Halt outline (mouse click must not leave a persistent outline). Automated: `npm run test:playwright:quarantine-focus`.

## Packaging

| Platform | Command / workflow |
|----------|--------------------|
| Publish all | Actions → `desktop-release` (tag `desktop-v*` or dispatch) → GitHub Release assets |
| macOS `.app` + notarize | `npm run pack:macos` then workflow `desktop-notarize-macos` (`APP_ONLY=1`) with signing secrets; then **desktop-promote-macos-url** once notarized HEAD is 200 |
| Windows NSIS | CI `desktop-windows` stages `node.exe` and runs `makensis` |
| Linux amd64 `.deb` | CI `desktop-linux` uploads `preventive-shield_0.2.0_amd64.deb` |

### Notarized macOS zip — upload + promote checklist

Asset name in `shared/desktop-downloads.json`: `macosAppZipUrlNotarized` → `buusdo-cybersecurity-service-tool-macos-app-notarized.zip` on Release tag `releaseTag`.

1. [ ] Build macOS app (`npm run pack:macos` / CI artifact).
2. [ ] Actions → **desktop-notarize-macos** attaches notarized zip to the same GitHub Release (tag = `releaseTag`).
3. [ ] Soft HEAD: `npm run verify:desktop-downloads` → `NOTARIZED_HEAD_OK=1` (or wait until GitHub CDN propagates).
4. [ ] Actions → **desktop-promote-macos-url** (`release_tag` = `releaseTag`) → PR sets `macosAppZipUrl` = notarized URL.
5. [ ] Merge PR → Website Settings macOS link + desktop `GET /api/update-check` (`preferNotarized` / `downloadUrl`) agree on the notarized zip.
6. [ ] Until step 4, Settings shows **unsigned until promote** (`data-testid=settings-desktop-mac-unsigned-note`).

Promote Settings primary macOS URL after notarized HEAD 200 (tag from `shared/desktop-downloads.json`):

```bash
gh workflow run desktop-promote-macos-url.yml -f release_tag="$(node -e "process.stdout.write(require('./shared/desktop-downloads.json').releaseTag||'')")"
```

When the promote workflow falls back to a commit comment, it uploads a PR-named diff artifact. If Actions does not expose `artifact-url`, the job summary still prints `ARTIFACT_ID=` on its own line plus a copy-paste download hint:

```bash
# summary also prints: ARTIFACT_ID=<id>
gh api repos/<owner>/<repo>/actions/artifacts/<ARTIFACT_ID>/zip > desktop-downloads-promote-diff-pr-<N>.zip
```

Nightly / manual: Actions → CI → Run workflow → enable **run_mvp** and **run_desktop_check** (mvp installs Playwright Chromium for DOM Standby and uploads `smoke-currentDir-timeline.json`).