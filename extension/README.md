# buusdo — browser extension

Chrome and Safari (macOS) share the same `extension/` folder: Manifest V3, vanilla JS / CSS / HTML.

**Blocking** (trackers, phishing host signals, personal lists) belongs here and in the desktop app. The website only **checks** addresses. Move lists across devices with a portable JSON export (USB / free Drive / Syncthing) — see the website README “Free cross-device data” and [`shared/SHIELD_LISTS_V1.md`](../shared/SHIELD_LISTS_V1.md).

### Personal lists + dense QR (phone → extension)

1. On desktop or another browser, open Personal lists → **Show QR** (≤40 hosts) or copy the dense payload.
2. Dense payload shape (no schema noise): `{"b":["bad.example"],"t":["ok.example"]}`. Optional zlib form from desktop `GET /api/lists/qr?zlib=1`: `ZB1:<base64-deflate>`.
3. On phone: scan the canvas QR (or paste the payload into any free QR/notes tool). Tick **Zlib QR** on the desktop when the camera fails on long JSON — same paste path accepts `ZB1:…`.
4. On this extension: Data ≠ Never → **Paste QR / dense JSON** (reads the clipboard — no file needed) or **Import JSON** for a full `shield-lists-v1` backup file.

Support only: a successful paste writes ISO timestamp `shieldListsLastPasteAt` to `chrome.storage.local` (no payload). Visible under Data → Diagnostics; cleared when Data returns to Never store. Website-API checks send `personalListBlocked: true` when the active tab host is on the personal block list (read-only hint).

| Message / key | When | Fields (no paste payload) |
|---------------|------|---------------------------|
| `shieldListsLastPasteAt` | After successful paste | ISO string in `chrome.storage.local` |
| `SHIELD_LISTS_EXPORT` | Export JSON | `lastPasteAt` ISO or `null` |
| `SHIELD_SUPPORT_BLOB` | Data = Diagnostics only | `{ at, lastPasteAt, source, trackersApiAnnounceActive, trackersMutedAnnounced, accountSignedIn }` — error `need-diagnostics` otherwise. `accountSignedIn` is a boolean only (never email). |
| **Support diagnostics JSON** (popup button) | Data = Diagnostics only — disabled (`aria-disabled`) until Diagnostics is selected | Copies the support blob; outside Diagnostics: muted button + need-diagnostics status |

**Diagnostics note:** when Data = Diagnostics, the support blob may include `accountSignedIn: true|false` so operators can see whether list sync tokens are present — never the account email.

## What it does

- **Tracker blocking** via `declarativeNetRequest` and known tracker hosts (`rules/tracker_blocklist.json`).
- **Phishing signals** in the background worker: lookalike organisation names, punycode sign-in paths, numeric hosts, and secrets placed in the link.
- **Page toasts** when a tracker or phishing pattern is blocked. Optional **Dismiss**: popup toggle **Toast dismiss button** (default off) writes `chrome.storage.local.shieldToastDismiss` and announces via `role="status"`. The service worker reads that flag and passes `dismiss: true|false` on every `SHIELD_TOAST`; the content script trusts that boolean only (no storage read). Button via `appendToastAction` under `data-testid="result-action-row"`.
- **Popup** with one status word (Standby / Clear / Hold / Halt) and **Run**.
- **Website API mute announce** — when the popup level comes from `/api/check`, Trackers is muted and `aria-live` announces once; clear delay is `TRACKERS_ANNOUNCE_CLEAR_MS` in `shared/trackers-announce.mjs` (so a later API scan can re-announce).
- Local UI strings for the supported locales.
- **Privacy modes** — default never store; optional this-device log or diagnostics for support.

## Users — install from stores

| Browser | Where |
|---------|--------|
| **Chrome** | [Chrome Web Store](https://chromewebstore.google.com/) — **Add to Chrome** (listing URL in [`shared/extension-stores.json`](../shared/extension-stores.json) after publish) |
| **Safari (macOS)** | [Mac App Store](https://apps.apple.com/) — install **buusdo**, then Safari → **Settings → Extensions** → enable |

Packaging / App Store Connect / Web Store upload: [docs/EXTENSION_STORE_DISTRIBUTE.md](../docs/EXTENSION_STORE_DISTRIBUTE.md).

```bash
npm run pack:chrome-store    # zip for Chrome Web Store
npm run safari:archive       # Release archive (needs Apple team signing)
```

## Chrome (developers — Load unpacked)

1. Open `chrome://extensions` → Developer mode → **Load unpacked** → this `extension/` folder.
2. Confirm Website API base is `https://buusdocst.mtsu.workers.dev` → **Run** on an https tab.
3. Do **not** tell end users to Load unpacked — ship via **`npm run pack:chrome-store`**.

Local CF timeouts: [LOCAL_CF_CONNECTIVITY.md](../docs/LOCAL_CF_CONNECTIVITY.md).

## Safari (developers — Xcode)

Wrapper app: `../safari/` (points at this folder). Requires **Safari 16.4+**.

1. `npm run safari:build` or Run in Xcode.
2. Develop → Allow Unsigned Extensions while iterating.
3. End users get the app from the **Mac App Store**, not unsigned Debug builds.

Regenerate wrapper after a major manifest change:

```bash
xcrun safari-web-extension-converter "$(pwd)" \
  --project-location "../safari" \
  --app-name "buusdo Cybersecurity Service Tool" \
  --bundle-identifier "com.buusdo.cst" \
  --macos-only --swift --force --no-open --no-prompt
```

## Browser differences

| Topic | Chrome | Safari |
|-------|--------|--------|
| API object | `chrome` (via `shared/browser-api.js`) | `browser` (same shim) |
| Background | service worker + `importScripts` | same (no `background.type: module`) |
| DNR match debug | optional `onRuleMatchedDebug` when available | not used; scan still counts trackers from page resources |

## Key files

| Path | Role |
|------|------|
| `manifest.json` | MV3, DNR ruleset, Safari `browser_specific_settings` |
| `rules/tracker_blocklist.json` | Tracker hosts |
| `background/service-worker.js` | Detection, counters, toasts, local log |
| `content/` | Page toast UI |
| `popup/` | Run UI + prefs (ES modules) |
| `shared/browser-api.js` | `browser` / `chrome` alias for popup |
| `shared/*.classic.js` | Same helpers for the classic background worker |

## Privacy

Privacy defaults to never store. The popup can switch to this-device only or diagnostics for support (`{ source, threat_type }` only — to troubleshoot technical issues, not to publish privacy).

## Website `/api/check` (live)

Do **not** wire Google Safe Browsing or other third-party reputation APIs into the extension.

The popup **Run** path calls the production Website API (`DEFAULT_API_BASE` → `https://buusdocst.mtsu.workers.dev`) `POST /api/check` and renders `analysis.risk` / `analysis.timing` / `analysis.live` — see [`docs/API_CHECK_CONTRACT.md`](../docs/API_CHECK_CONTRACT.md). Local address signals in `shared/detect.js` still power on-page phishing/tracker heuristics in the service worker.

Popup Website-API mute announce (Trackers digit + `aria-live`) uses [`shared/trackers-announce.mjs`](shared/trackers-announce.mjs) (`TRACKERS_ANNOUNCE_CLEAR_MS`) so a later `/api/check` scan can re-announce after the clear delay.

Chrome + Safari MVP steps: [docs/EXTENSION_CHROME_SAFARI.md](../docs/EXTENSION_CHROME_SAFARI.md).

**Operators:** `probe-blocked` (HTTP 403/429/503) is not phishing proof — see [Operators FAQ — probe-blocked vs phishing](../docs/API_CHECK_CONTRACT.md#operators-faq--probe-blocked-vs-phishing) in the contract.