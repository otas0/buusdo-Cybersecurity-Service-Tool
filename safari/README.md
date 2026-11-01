# Safari wrapper for Preventive Shield

Xcode macOS app that hosts the shared WebExtension in `../extension/`.

Bundle IDs: app `pt.community.preventiveshield`, extension `pt.community.preventiveshield.Extension`.

## Run

1. Open `Preventive Shield/Preventive Shield.xcodeproj`.
2. Run the **Preventive Shield** scheme (Debug build is verified with `xcodebuild`).
3. Safari → **Settings → Extensions** → turn on **Preventive Shield**.
4. Use **Develop → Allow Unsigned Extensions** while developing.

See `../extension/README.md` for full Chrome and Safari notes.