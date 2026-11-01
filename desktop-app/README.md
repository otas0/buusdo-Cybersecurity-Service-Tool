# Preventive Shield — Desktop App

Local Node.js companion to the Chrome extension (`../extension`) and the first-party website check API.

**Blocking** (proxy + scan + personal lists) lives here and in the extension. The website only **checks** addresses — it does not store or enforce your personal block list.

### Personal lists (`shield-lists-v1`)

Dashboard **Personal lists** block/trust hosts and write `desktop-app/data/shield-backup.json` (override with `SHIELD_LISTS_PATH`). Schema: [`shared/SHIELD_LISTS_V1.md`](../shared/SHIELD_LISTS_V1.md). Export/import the same JSON as the extension.

**Syncthing (optional):** point a Syncthing folder at `desktop-app/data/` (or the file’s parent) so `shield-backup.json` syncs across machines; import is not required when both sides watch the same file path via the shared folder.

**File watch:** the desktop process watches the **parent directory** of `shield-backup.json` (not only the file inode). Syncthing often does an atomic replace (write temp → rename), which can remove and recreate the file — directory watch still fires, then the store reloads and emits an SSE `lists` event so the dashboard updates without polling. Duplicate emits from API write + watch are debounced (~600ms) by list signature.

**Proxy response headers:** refused HTTP/CONNECT responses set `X-Preventive-Shield: blocked` and `X-Preventive-Shield-Kind` to `tracker` | `phishing` | `user-block` (personal list).

**Reveal file:** dashboard **Reveal file** calls `POST /api/lists/reveal`. With Node-only `npm start` it returns `{ deferred: true }` and the UI copies the path. With the optional Electron shell:

```bash
cd desktop-app
npm install --save-dev electron   # once
npm run electron                  # sets global.__shieldElectronShell → shell.openPath
```

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
| HTTP proxy | `127.0.0.1:8080` | Plain-HTTP interceptor against the shared tracker / phishing signal lists |

## Run

```bash
cd desktop-app
npm install
npm start
```

Then open the dashboard (default **http://localhost:3010** — `UI_PORT` defaults to **3010** so vinext can keep `:3000`). Override with `UI_PORT=3000` only if the website is not running on 3000.

### Website check env

| Variable | Default | Role |
|----------|---------|------|
| `WEBSITE_CHECK_URL` | `http://localhost:3000` | First-party website origin (vinext `npm run dev`). Prefer `localhost` over `127.0.0.1` — vinext binds hostname `localhost` (often IPv6). Use `http://localhost:3001` only if the site was started with `npm run dev:3001`. |
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