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

Listing copy + screenshot captions: [`CHROME_STORE_LISTING_DRAFT.md`](./CHROME_STORE_LISTING_DRAFT.md).

### Package

```bash
npm run extension:validate
npm run pack:chrome-store
# → dist/chrome-webstore/preventive-shield-<version>.zip
```

The zip:

- Copies `extension/` (no README)
- Sets `homepage_url` from stores JSON
- Drops `localhost` / `127.0.0.1` `host_permissions` (dev still uses unpacked `extension/`)

### Dashboard

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. **New item** → upload the zip
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

Wrapper: `safari/buusdo/` (bundle `pt.community.preventiveshield`).

### Archive (operator Mac)

1. Xcode → open `safari/buusdo/buusdo.xcodeproj`
2. Signing & Capabilities → your **Apple Developer Team** (Automatic)
3. Scheme **buusdo** → **Any Mac** → **Product → Archive**
4. Organizer → **Distribute App** → **App Store Connect**
5. App Store Connect: listing screenshots, privacy nutrition labels, category Utilities / Productivity
6. Privacy policy URL: `https://buusdocst.mtsu.workers.dev/en/privacy` — note the companion desktop app’s honest limits (no TLS decrypt, no process kill, system dirs report-only).
7. Review notes: Safari Web Extension; after install user enables it under Safari → Settings → Extensions

CLI (optional, after team is set):

```bash
npm run safari:archive
```

### After approval

```json
"safariAppStoreUrl": "https://apps.apple.com/app/id…"
```

Redeploy website → Settings **Get on Mac App Store**.

### User steps (public copy)

1. Open the **Mac App Store** → search **buusdo** → Get.
2. Open the app once if prompted.
3. Safari → **Settings → Extensions** → enable **buusdo**.
4. Pin the toolbar button → open an https page → **Run**.

---

## Versioning

- Bump `extension/manifest.json` `version` before each store upload.
- Safari marketing version in Xcode should match (or document the mapping).
- Keep `npm run extension:validate` green before packaging.