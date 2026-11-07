# buusdo Cybersecurity Service Tool

**Product (Workers):** https://buusdocst.mtsu.workers.dev/ · **China entry (GitHub Pages):** https://otas0.github.io/buusdo-Cybersecurity-Service-Tool/

Official product name: **buusdo Cybersecurity Service Tool**. Part of the **Buusdo** product **line**, but a **separate** product (own content and name — not “Buusdo” itself, not other Buusdo-line apps). Bilingual English / European Portuguese; helps non-expert users check a website before they trust it.

**Detect → Explain → Prevent / Block → Act → Verify**

The website (`app/`) is the primary surface. Extension and desktop share the same instrument identity and are polished after the website ships.

Data storage defaults to off. Users can choose never store, this device only, or optional diagnostics for support (`{ source, threat_type }` only — never the address, never for public release).

## Capabilities

- Check **any** http(s) website address — not only known brands
- URL structure, HTTPS, punycode, risky TLDs, sensitive paths, secrets in links
- Automatic brand lookalike / impersonation detection when a known name appears
- Live DNS + reachability + redirect-chain checks via `/api/check`
- **First-party threat intel** — curated host list + address signals (no Google Safe Browsing / third-party reputation APIs; checked URLs stay on this server)
- Deterministic risk classification with evidence for every check
- Reversible browser-local block, trust, and optional check history (when storage is allowed)
- English and European Portuguese
- Automated security and scenario tests

## Website routes

- `/en` and `/pt-PT` — check a website address
- `/en/settings` and `/pt-PT/settings` — privacy mode, blocked and trusted lists, own-intel note
- `/en/privacy` and `/pt-PT/privacy` — privacy policy (ship before public promotion)
- `/api/health` — service status (confirms first-party threat mode, exposes `probeTimeoutMs`, `curatedListPresent`)
- `POST /api/check` — `{ ok, analysis }` where `analysis.timing` includes `parseMs`, `threatMs`, `probeMs`, `riskMs`, `totalMs`, `probeTimeoutMs`, `probeHeadFailed`, `headSkipped`

Timing contract for clients (extension / desktop): [docs/check-timing.schema.json](docs/check-timing.schema.json), [docs/openapi-check-timing.yaml](docs/openapi-check-timing.yaml), [docs/API_CHECK_CONTRACT.md](docs/API_CHECK_CONTRACT.md).

## Run locally

Node.js 22.13 or newer is required.

```bash
npm install
npm run dev
```

Open **http://localhost:3000** (vinext/Vite default; printed as `Local:`). Prefer `localhost` over `127.0.0.1` — the server binds hostname `localhost` (often IPv6 `[::1]`).

```bash
npm run health:smoke   # GET /api/health on :3000 (asserts ok + own intel + curated list)
npm run health:prod -- --url https://YOUR_DOMAIN   # same checks against production
npm run check:prod -- --url https://YOUR_DOMAIN    # POST /api/check smoke (probe + timing)
npm run dev:3001       # optional: listen on :3001 if you prefer the old port
```

### Production hosting (Cloudflare)

Website ships on **Cloudflare Workers** via vinext (not Vercel). GitHub Free is fine for git + CI.

```bash
npx wrangler login
export CLOUDFLARE_ACCOUNT_ID=…   # dash.cloudflare.com/<id>
npm run deploy:cloudflare         # vinext build && wrangler deploy
npm run health:prod -- --url https://YOUR_WORKER.workers.dev
npm run check:prod -- --url https://YOUR_WORKER.workers.dev
npm run production:origin -- https://YOUR_WORKER.workers.dev   # writes README + client defaults
```

### Live production origin

- **Origin:** `https://buusdocst.mtsu.workers.dev`
- **Canonical host:** `buusdocst.mtsu.workers.dev` (prefer apex; redirect `www` → apex)
- Set after deploy: `npm run production:origin -- https://buusdocst.mtsu.workers.dev`
- Health: `npm run health:prod -- --url https://buusdocst.mtsu.workers.dev`
- Check smoke: `npm run check:prod -- --url https://buusdocst.mtsu.workers.dev`

Ops docs: [PRODUCTION_HOSTING](docs/PRODUCTION_HOSTING.md) · [LAUNCH_CHECKLIST](docs/LAUNCH_CHECKLIST.md) · [DEPLOY_SECRETS](docs/DEPLOY_SECRETS.md) · [CUSTOM_DOMAIN_REDEPLOY](docs/CUSTOM_DOMAIN_REDEPLOY.md) · [CANONICAL_HOST](docs/CANONICAL_HOST.md) · [CLOUDFLARE_ALERTS](docs/CLOUDFLARE_ALERTS.md) · [LOCAL_CF_CONNECTIVITY](docs/LOCAL_CF_CONNECTIVITY.md) · [POST_LAUNCH_48H](docs/POST_LAUNCH_48H.md) · [VINEXT_UPGRADE_1_4](docs/VINEXT_UPGRADE_1_4.md)

Scheduled monitor: set GitHub Actions variable `PRODUCTION_HEALTH_URL` → workflow **Production health**.  
Optional deploy: Actions → **Deploy Cloudflare** with secrets from [DEPLOY_SECRETS.md](docs/DEPLOY_SECRETS.md).


### Local ports

| Surface | Default URL | Notes |
|---------|-------------|--------|
| Website (vinext) | `http://localhost:3000` | `npm run dev` — prefer `localhost` over `127.0.0.1` |
| Desktop UI | `http://localhost:3010` | `UI_PORT` (default **3010** so it does not clash with the website) |
| Desktop HTTP proxy | `127.0.0.1:8080` | Tracker / phishing / personal-list host blocks |
| Optional website | `http://localhost:3001` | `npm run dev:3001` |
| Desktop personal lists | `desktop-app/data/shield-backup.json` | `shield-lists-v1`; override with `SHIELD_LISTS_PATH` (Syncthing-friendly) |
| Desktop Electron (optional) | same UI port | `cd desktop-app && npm i -D electron && npm run electron` — enables Finder/Explorer reveal via `shell.openPath` (`optional` Electron, not required for `npm start`) |

### Who blocks what

| Surface | Role |
|---------|------|
| **Website** | Check addresses only (risk, evidence, feedback drafts). Does **not** store or enforce a personal block list. |
| **Browser extension** | Blocks trackers / phishing signals in the browser; personal lists belong here. |
| **Desktop app** | Blocks via the local HTTP proxy + scan UI; personal/session block log belongs here. |

### Free cross-device data (no paid cloud)

Use a **portable JSON backup** you control — zero hosting cost:

1. Export block/trust from the extension or desktop as **`shield-lists-v1`** JSON (`shared/SHIELD_LISTS_V1.md` — `blocked[]`, `trusted[]`, `updatedAt`).
2. Copy that file via anything free you already use: USB, email-to-self, iCloud/Google Drive/OneDrive free tier, Syncthing watching `shield-backup.json`, or a private git gist. Optional: compact QR payload for short host lists (phone → desktop).
3. Import the same file on another device / surface.

Optional later (still free): Chrome/Firefox **extension sync** for small prefs if the user is signed into the browser; keep block lists in the export file so the website stays check-only and never becomes a sync server.

## Quality checks

```bash
npm run evaluate
npm run test
npm run typecheck
npm run lint
npm run threat:check
npm run build
npm audit --omit=dev
```

Or one gate: `npm run check` (unit tests → `npm run smoke:desktop-scan-resources` → typecheck → lint → threat:check → build). The desktop smoke is Playwright-free and asserts privacy-off clears scan-resources session storage.

`npm run threat:check` = validate curated list + regression. Exit codes: `0` OK, `1` dirty/invalid curated list or regression failure (CI should fail the job), `2` could not read the curated file.

## Operating the curated threat list

First-party hosts: `security/data/curated-threats.json` plus optional `curated-threats.pt.json` (merged unless `OWN_THREAT_MERGE_PT=0`). See `security/data/README.md`.

After a PT list apply (`--target=pt` or `_template.pt.json`), run `npm run evaluate` and keep **EVAL-029–032** green (MERGE_PT on/off + benign lookalike). See `npm run threat:check:help`.

### Screenshot-style flow (product → apply)

1. **Check** a site on `/en` (Data = This device only).
2. **Wrong result?** → draft report / false-positive.
3. **Settings → Feedback drafts** → set `reviewedBy` if ready → **Export batches/*.json**.
4. Move the download into `security/data/batches/`.
5. In the JSON set `reviewChecklist.readyToApply` (and related flags) to `true`.
6. Apply:

```bash
npm run threat:apply -- security/data/batches/your-batch.json
```

Or hand-edit from `security/data/batches/_template.json`.

**After any change to curated lists, `npm run regression` / `npm run threat:check` is required before commit.**

## Architecture

- `app/` — App Router, localized routes, product styles
- `components/` — check form, results, settings, privacy
- `security/` — parsing, identity, own threat list (`data/curated-threats.json`), live probe, risk, persistence
- `i18n/` — EN / pt-PT copy
- `evaluation/` — scenario runner for regression evidence
- `tests/` — unit tests (may use `.test` fixtures; not product UI)
- `extension/`, `desktop-app/`, `shared/` — secondary surfaces

## Limitations

No result means “safe.” A missing reputation match means only that no known threat was found in the sources checked. HTTPS does not prove identity. Local blocks apply only inside this product in the current browser, not across the whole device.