# Safari wrapper for buusdo Cybersecurity Service Tool

Xcode macOS app that hosts the shared WebExtension in `../extension/`.

Bundle IDs (legacy on-disk): app `pt.community.preventiveshield`, extension `pt.community.preventiveshield.Extension`.  
User-facing display name: **buusdo Cybersecurity Service Tool**.

## Users

Install from the **Mac App Store** (search **buusdo Cybersecurity Service Tool**), then enable the extension in Safari → Settings → Extensions.  
Store URL after approval: `../shared/extension-stores.json` → `safariAppStoreUrl`.  
Submit steps: [`../docs/EXTENSION_STORE_DISTRIBUTE.md`](../docs/EXTENSION_STORE_DISTRIBUTE.md).

```bash
npm run safari:archive   # Release archive → Organizer → App Store Connect
```

## Developers (Debug)

```bash
npm run safari:build
open "/tmp/ps-safari-dd/Build/Products/Debug/Preventive Shield.app"
```

Or open `Preventive Shield/Preventive Shield.xcodeproj` → Run. Use **Develop → Allow Unsigned Extensions** while iterating.  
(On-disk Xcode folder names remain legacy; Finder/Dock label uses CFBundleDisplayName.)

Chrome Web Store + shared package: `../extension/README.md`, `../docs/EXTENSION_CHROME_SAFARI.md`.