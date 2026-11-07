# Extension store distribution (Chrome + Safari)

**User install path (product):**

| Browser | How users get it |
|---------|------------------|
| **Safari (macOS)** | **Mac App Store** — search **buusdo Cybersecurity Service Tool**, install the wrapper app, enable the extension in Safari → Settings → Extensions |
| **Chrome** | **Chrome Web Store** — search **buusdo Cybersecurity Service Tool** (or open the listing URL), **Add to Chrome** |

Developer Load unpacked / unsigned Xcode builds stay for engineering only — not the public install story.

Config: [`shared/extension-stores.json`](../shared/extension-stores.json)  
Website Settings reads those URLs as primary buttons.

---

## Chrome Web Store

**Item name:** `buusdo Cybersecurity Service Tool` (never short “buusdo” alone).  
Listing copy + screenshot captions: [`CHROME_STORE_LISTING_DRAFT.md`](./CHROME_STORE_LISTING_DRAFT.md).  
Screenshot frames must show the formal name (see `docs/store-screenshots/`).

### Package

```bash
npm run extension:validate
npm run pack:chrome-store
# → dist/chrome-webstore/buusdo-cybersecurity-service-tool-<version>.zip
```

The zip:

- Copies `extension/` (no README)
- Sets `homepage_url` from stores JSON
- Drops `localhost` / `127.0.0.1` `host_permissions` (dev still uses unpacked `extension/`)

### Dashboard

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Paste **Short description** from [`CHROME_STORE_LISTING_DRAFT.md`](./CHROME_STORE_LISTING_DRAFT.md) (must not contain the word “sync” — CI `assert:formal-name` enforces this)
3. Upload screenshot order: Halt (`FRAME-formal-name.png`) → Clear + Hold shot 2 (`FRAME-clear.png`, `FRAME-hold.png`) from `dist/chrome-webstore/listing-screenshots/` (or `docs/store-screenshots/`) with captions from the draft
4. **New item** → upload the zip
5. After approval only: set `chromeWebStoreUrl` + `chromeWebStoreItemId` in [`shared/extension-stores.json`](../shared/extension-stores.json) — never invent URLs
3. Listing: EN + pt-PT descriptions, screenshots (popup Clear / Hold / Halt + Settings). Screenshot caption (EN): “Companion desktop app: no TLS decryption, no process kill, system folders report-only — see Privacy → Honest limits.” (pt-PT: “App de ambiente de trabalho: sem desencriptação TLS, sem terminar processos, pastas de sistema só reportadas — ver Privacidade → Limites honestos.”)
4. **Single purpose** / privacy: first-party check only; link Privacy → `https://buusdocst.mtsu.workers.dev/en/privacy`. One listing sentence: the companion desktop app does not decrypt TLS, does not kill processes, and only reports system directories (see Privacy → Honest limits).
5. Host permission justification: Website API `buusdocst.mtsu.workers.dev` + DNR tracker blocking
6. Submit for review

### After approval

```json
"chromeWebStoreUrl": "https://chromewebstore.google.com/detail/…",
"chromeWebStoreItemId": "…"
```

Redeploy the website so Settings shows **Get for Chrome**.

---

## Safari — Mac App Store

Wrapper path (on disk): `safari/Preventive Shield/Preventive Shield.xcodeproj`.  
**Bundle IDs (formal):** app `com.buusdo.cst`, extension `com.buusdo.cst.Extension` (legacy `pt.community.preventiveshield*` retired in pbxproj). Match [`shared/extension-stores.json`](../shared/extension-stores.json).

### Archive + resign (operator Mac)

1. Xcode → open `safari/Preventive Shield/Preventive Shield.xcodeproj`
2. Confirm **PRODUCT_BUNDLE_IDENTIFIER** = `com.buusdo.cst` / `.Extension`
3. Signing & Capabilities → your **Apple Developer Team** (Automatic) → clean build folder → rebuild so Xcode re-signs
4. Scheme for the app target → **Any Mac** → **Product → Archive**
5. Organizer → **Distribute App** → **App Store Connect**
6. App Store Connect: listing screenshots, privacy nutrition labels, category Utilities / Productivity
7. Privacy policy URL: `https://buusdocst.mtsu.workers.dev/en/privacy`
8. Review notes: Safari Web Extension; after install enable under Safari → Settings → Extensions

CLI (optional, after team is set):

```bash
npm run safari:archive
```

Codesign/notarize/App Store upload still need a local Apple Developer identity — CI cannot invent certificates.

### After approval

Paste into `shared/extension-stores.json` (do **not** invent URLs before approval):

```json
"safariAppStoreUrl": "https://apps.apple.com/app/id…"
```

Redeploy website → Settings **Get on Mac App Store**.

### App Store Connect display name

**Name / subtitle:** `buusdo Cybersecurity Service Tool`  
Xcode `INFOPLIST_KEY_CFBundleDisplayName` is already set to the same string (app + extension targets). On-disk project folders may still say `Preventive Shield` — do not rename without a migrate plan.

### User steps (public copy)

1. Open the **Mac App Store** → search **buusdo Cybersecurity Service Tool** → Get.
2. Open the app once if prompted.
3. Safari → **Settings → Extensions** → enable **buusdo Cybersecurity Service Tool**.
4. Pin the toolbar button → open an https page → **Run**.

---

## Versioning

- Bump `extension/manifest.json` `version` before each store upload.
- Safari marketing version in Xcode should match (or document the mapping).
- Keep `npm run extension:validate` green before packaging.