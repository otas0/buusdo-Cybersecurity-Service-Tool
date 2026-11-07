# Safari wrapper for buusdo Cybersecurity Service Tool

Xcode macOS app that hosts the shared WebExtension in `../extension/`.

Bundle IDs: `com.buusdo.cst` / `com.buusdo.cst.Extension` (set in `project.pbxproj` + `ViewController.swift`). Resign locally with your Apple Developer Team after pull.
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

**LargeIcon preview:** open the mac target → Assets → `LargeIcon.imageset` (or About chrome). Confirm dark field `#0e0e0e` with Halt mark — **no white plate**. CI: `npm run assert:safari-largeicon`.

Verified 2026-11-07: corner samples `rgba(14,14,14,255)`, center Halt `rgba(255,77,0,255)` on 1x/2x/3x; `assert:safari-largeicon` green (zero white-plate pixels). After `npm run sync:brand-web`, re-run assert and glance Assets in Xcode.

Chrome Web Store + shared package: `../extension/README.md`, `../docs/EXTENSION_CHROME_SAFARI.md`.
