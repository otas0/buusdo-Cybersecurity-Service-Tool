# Extension — Chrome + Safari (users + operators)

Website MVP: `https://pcpd.mtsu.workers.dev`. Desktop app is out of scope here.

## Users (public install)

| Browser | Download |
|---------|----------|
| **Safari** | **Mac App Store** — install **buusdo Cybersecurity Service Tool**, then enable under Safari → Settings → Extensions |
| **Chrome** | **Chrome Web Store** — **Add to Chrome** (listing name: **buusdo Cybersecurity Service Tool**) |

Store URLs live in [`shared/extension-stores.json`](../shared/extension-stores.json) (filled after each store approves). Full submit steps: [EXTENSION_STORE_DISTRIBUTE.md](EXTENSION_STORE_DISTRIBUTE.md).

Until a URL is set, the website Settings button shows “listing soon” and links here for operators.

## Operators (dev only)

### Preconditions

- [x] Website health + `check:prod` on pcpd
- [x] `npm run extension:validate`
- [x] `npm run safari:build` (Debug)

### Chrome — Load unpacked (engineering)

1. Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → `extension/`.
2. Confirm API base `https://pcpd.mtsu.workers.dev` → **Run** on an https tab.
3. Ship to users via **`npm run pack:chrome-store`** + Web Store upload — not unpacked.

### Safari — Xcode (engineering)

1. `npm run safari:build` or Run in Xcode.
2. Enable unsigned extension while developing.
3. Ship to users via **Mac App Store** archive ([EXTENSION_STORE_DISTRIBUTE.md](EXTENSION_STORE_DISTRIBUTE.md)).

## Done when (store MVP)

| Check | Chrome | Safari |
|-------|--------|--------|
| Listed / installable from store | Web Store | Mac App Store |
| Privacy URL on listing | `/en/privacy` | `/en/privacy` |
| One Run after install | yes | yes (extension enabled in Safari) |
| Website Settings primary CTA | store URL | store URL |