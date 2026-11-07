# buusdo — Desktop App (MVP)

On launch it scans this computer as far as the signed-in user can read. If it finds something actionable, it asks whether to block all of it. **Yes** adds hosts to the personal block list and quarantines allowed user-owned files. **No** leaves them in place. System folders are not edited, processes are not killed, HTTPS is not decrypted. Restore undoes this scan’s hosts and quarantined files.

```bash
cd desktop-app && npm install
npm run install:silent    # data dir; open-at-login stays off
npm run launch            # scan → ask → proxy on :8080, UI on :3010
# verify gate (repo root): SHIELD_QUIT_GRACE_MS=0 npm run mvp
# release notes: RELEASE.md
```


The website only **checks** addresses. Blocking lives here and in the extension.

### Personal lists (`shield-lists-v1`)

Dashboard **Personal lists** write `shield-backup.json` under the user data directory (macOS: `~/Library/Application Support/Preventive Shield/`; override with `SHIELD_LISTS_PATH` / `SHIELD_DATA_DIR`). Schema: [`shared/SHIELD_LISTS_V1.md`](../shared/SHIELD_LISTS_V1.md).

**Syncthing (optional):** sync that user data directory (or the lists file’s parent).

**File watch:** the desktop process watches the **parent directory** of `shield-backup.json` (not only the file inode). Syncthing often does an atomic replace (write temp → rename), which can remove and recreate the file — directory watch still fires, then the store reloads and emits an SSE `lists` event so the dashboard updates without polling. Duplicate emits from API write + watch are debounced (~600ms) by list signature.

**Proxy response headers:** refused HTTP/CONNECT responses set `X-Preventive-Shield: blocked` and `X-Preventive-Shield-Kind` to `tracker` | `phishing` | `user-block` (personal list).

**Reveal file:** `POST /api/lists/reveal`. With the launcher/browser shell it returns `{ deferred: true }` and the UI copies the path.

**SSE lists debounce:** `SHIELD_LISTS_SSE_DEBOUNCE_MS` (default `600`) suppresses duplicate `lists` events when an API write and `fs.watch` both fire.

**Log filter chips:** ring-buffer badges (Trackers / Signals / Personal) count entries still in the recent log. Lifetime `· Σn` chips next to Trackers/Signals show session totals (`totalTrackersBlocked` / `totalPhishingBlocked`) so operators still see volume after personal blocks dominate the ring. **Clear ring** empties the on-screen recent log and zeroes ring badges only — it does **not** wipe lifetime Σ for the session (those counters live on the desktop process state until restart). Clear ring is **client-side only** (no `POST /api/log/clear-ring`, no SSE); curl/`GET /api/events` still see the process ring until restart. Add a clear-ring API only if multi-tab operators need sync.

### Operator FAQ

**Does Clear ring fan out over SSE / `/api/events`?** No. It only clears the dashboard’s on-screen recent-log view. Other tabs and `curl`/`GET /api/events` keep seeing process ring entries until restart (or a future clear-ring API if multi-tab sync is required).

**Website `/api/check` — `probe-blocked` vs phishing:** HTTP 403/429/503 from the live probe is **not** phishing proof (`probe-blocked` + `ambiguousProbeStatus`). See [Operators FAQ — probe-blocked vs phishing](../docs/API_CHECK_CONTRACT.md#operators-faq--probe-blocked-vs-phishing).

**Dense / zlib QR:** `GET /api/lists/qr` returns dense `{b,t}` JSON; `?zlib=1` (or `?both=1` for both) returns `ZB1:` deflate+base64 for denser phone scans.

| Service | Address | Role |
|---------|---------|------|
| Dashboard UI | `http://localhost:3010` | Scan UI, bilingual EN / pt-PT, live block log (`UI_PORT`, default 3010) |
| Website API | `http://localhost:3000` | vinext `npm run dev` — set as `WEBSITE_CHECK_URL` |
| HTTP proxy | `127.0.0.1:8080` | Plain-HTTP interceptor against the shared tracker / phishing signal lists — see dashboard **proxy guide** for OS/browser setup |

## Run

```bash
cd desktop-app
npm install
npm run launch    # single-instance lock, opens the system browser, Quit stops ports
# or: npm start   # server only (no browser / lock)
```

Dashboard default **http://localhost:3010** (`UI_PORT`). Writable lists / quarantine / decisions live under the user data directory (see [PACKAGING.md](./PACKAGING.md)) — not inside the repo. Open at login stays **off** until enabled in the footer. The footer shows the data folder path (Syncthing) with a copy button.

### Home-scan continue timeline

`npm run smoke:desktop-home-continue` (from repo root) walks the real home directory read-only and writes a `currentDir` sample timeline to:

`desktop-app/dist/smoke-currentDir-timeline.json`

That path is gitignored (`dist/` + explicit timeline name); keep it as a local or CI artifact only. It never calls block/quarantine. Chart it locally via [`ops/home-continue-timeline.html`](../ops/home-continue-timeline.html).

Quit grace before closing sockets: `SHIELD_QUIT_GRACE_MS` (default `200`). Optional desktop smokes: `npm run check:desktop` (also a `workflow_dispatch` job in CI, not on every PR). That script runs proxy + install-accept smokes, the dashboard/ops/index **bare `:focus` gate** (`assert-dashboard-no-bare-focus`), **`verify:desktop-downloads:fixture`**, then prints and runs three tsx files: [`tests/focus-gate-bare-focus.test.ts`](../tests/focus-gate-bare-focus.test.ts), [`tests/spa-replace-state-hashchange.test.ts`](../tests/spa-replace-state-hashchange.test.ts), [`tests/home-continue-stamp-tag-only.test.ts`](../tests/home-continue-stamp-tag-only.test.ts). Related: [`tests/desktop-downloads-clear-stub.test.ts`](../tests/desktop-downloads-clear-stub.test.ts).

### Verify — focus-gate fixture dir

Unit tests / local assert only — never export in production CI. Never set / export `SHIELD_FOCUS_GATE_*` in Actions env. Example path:

`SHIELD_FOCUS_GATE_FIXTURE_DIR=tests/fixtures/focus-gate-bad node scripts/assert-dashboard-no-bare-focus.mjs`

(expects `index.html` + `home-continue-timeline.html` under that dir; see [RELEASE.md Focus-gate](./RELEASE.md#focus-gate-fixture-overrides).)

### Website check env

| Variable | Default | Role |
|----------|---------|------|
| `WEBSITE_CHECK_URL` | *(see below)* | Override first-party website origin. If **unset**, desktop reads `../shared/production-site.json` → `productionOrigin` after `npm run production:origin`; if that is empty, falls back to `http://localhost:3000`. Prefer `localhost` over `127.0.0.1` for local vinext. |

| `WEBSITE_HEALTH_POLL_MS` | `15000` (min `5000`) | How often the dashboard silently re-probes `/api/website-health` so the check button re-enables when the site comes up. Desktop passes this as `?pollMs=` on website `GET /api/health`; the JSON **echoes** `pollMs` so operators can confirm the interval without the UI. If the echo differs from the local poll, the health OK toast mentions it. |
| `CHECK_PERSONAL_HINT_LOG` | (unset = on) | Website env: set `0` to silence the fixed `[api/check] personalListBlocked hint accepted` soft notice. Health JSON echoes `personalHintLogEnabled`. |

Exposed on `GET /api/state` as `websiteHealthPollMs` / `websiteCheckUrl`.

### Test the proxy

1. Keep `npm start` running.
2. Point a client at **HTTP proxy `127.0.0.1:8080`**, for example:

```bash
curl -x http://127.0.0.1:8080 http://www.google-analytics.com/collect -i
# → HTTP 403 (blocked); dashboard toast + log update via SSE
# → X-Preventive-Shield: blocked
# → X-Preventive-Shield-Kind: tracker

curl -x http://127.0.0.1:8080 http://example.com/ -I
# → forwarded upstream (not on the blocklist)
```

Personal block (after adding `evil.example` in the dashboard Personal lists):

```bash
curl -x http://127.0.0.1:8080 http://evil.example/ -i
# → HTTP 403
# → X-Preventive-Shield: blocked
# → X-Preventive-Shield-Kind: user-block
```

3. Or type an address in the dashboard and press **Scan**. `www.google-analytics.com` is a tracker. `paypal.secure-login.example` is a phishing signal. `example.com` is clear.

**Manual QA — Scan resources (same-brand):** paste one URL per line in **Scan resources**, then Scan. Fixture line counts for smoke assert messages use `countFixtureLines` / `fixtureStringLength` in `public/js/scan-resources-session.mjs` (also `npm run smoke:desktop-scan-resources`). Related timing / website-check contract: [TIMING_SCHEMA.md](TIMING_SCHEMA.md#scan-resources-smoke-related).

| Page URL | Resources (fixtures) | Expect |
|----------|----------------------|--------|
| `https://www.youtube.com/` | `https://googleads.g.doubleclick.net/pagead/id` | third-party count **0** (Google family) |
| `https://www.snapchat.com/` | `https://sc-static.net/scevent.min.js` | third-party count **0** (Snapchat family) |
| `https://www.snapchat.com/` | `https://sc-static.net/scevent.min.js` + `https://hotjar.com/foo.js` | third-party count **1** (Hotjar only) |

### HTTPS / MITM (intentionally out of scope)

This app does **not** install a MITM certificate or decrypt TLS.

- **HTTP** requests through `:8080` are checked against the tracker list and phishing signals. Refused responses include `X-Preventive-Shield: blocked` and `X-Preventive-Shield-Kind: tracker|phishing|user-block`.
- **HTTPS** uses a blind `CONNECT` tunnel. Only the CONNECT **hostname** can be refused when it matches curated phishing **or** a personal `user-block` host — same Kind header parity as HTTP (`user-block` when the personal list matched). Request bodies and credentials are never read.

```bash
# After blocking evil.example in Personal lists — CONNECT host refuse:
curl -x http://127.0.0.1:8080 https://evil.example/ -i
# → connection refused / 403 path with X-Preventive-Shield-Kind: user-block (hostname-only; no TLS decrypt)
```

Production HTTPS filtering would require a trusted local CA; that is **not** implemented here.

### Privacy

- Privacy defaults to never store. Users can keep a local block log or enable diagnostics for support (`{ source, threat_type }` only).
- No credential capture. No browsing-history export.
- **Scan resources session:** the dashboard textarea persists resource URLs in `sessionStorage` only when privacy is local/share. Choosing **Never store** (privacy off) clears that key via `clearPersistedScanResourcesStorage` in `public/js/scan-resources-session.mjs`. Gate without Playwright: from repo root run `npm run smoke:desktop-scan-resources` (`scripts/desktop-scan-resources-smoke.mjs`).

## Key files

| Path | Role |
|------|------|
| `src/server.js` | Express UI `:3000` + starts proxy |
| `src/proxy-server.js` | HTTP proxy `:8080` |
| `src/threats.js` | Loads `../shared/detect.mjs` + personal lists overlay |
| `src/lists-store.js` | Persist `shield-lists-v1` to `data/shield-backup.json` |
| `src/log-store.js` | Optional support diagnostics when privacyMode is share |
| `src/state.js` | Counters, recent log, SSE fan-out |
| `public/` | Dashboard HTML/CSS/JS |
| `../shared/tokens.css` | Shared colours with the extension |
| `../shared/SHIELD_LISTS_V1.md` | Portable block/trust backup schema |

## Env overrides

- `UI_PORT` (default `3010`) — desktop dashboard; leave website on `:3000`
- `PROXY_PORT` (default `8080`)
- `WEBSITE_CHECK_URL` (default `http://localhost:3000`) — see **Website check env** above
- `WEBSITE_HEALTH_POLL_MS` (default `15000`, min `5000`)
- `SHIELD_LISTS_PATH` — absolute path to `shield-backup.json` (default `desktop-app/data/shield-backup.json`)
- `SHIELD_LISTS_SSE_DEBOUNCE_MS` (default `600`) — debounce window for SSE `lists` after write/watch